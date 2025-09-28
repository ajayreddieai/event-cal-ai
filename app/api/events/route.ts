import { NextResponse } from 'next/server';
import { Firecrawl } from '@mendable/firecrawl-js';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

type ExtractedEvent = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  location?: string;
  startDate?: string; // ISO date
  startTime?: string; // human readable time
  endDate?: string;
  endTime?: string;
  url?: string;
};

type CalendarEvent = {
  id: number;
  title: string;
  date: string; // YYYY-MM-DD
  time: string;
  location: string;
  category: string;
  description: string;
  url?: string;
};

const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes
let cached: { at: number; events: CalendarEvent[] } | null = null;

export async function GET() {
  try {
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return NextResponse.json({ events: cached.events }, { status: 200 });
    }

    // 1) Prefer reading from repo-stored JSON (fetched via raw GitHub URL or local file in dev)
    const RAW_URL = process.env.EVENTS_JSON_URL;
    let repoData: any = null;
    if (RAW_URL) {
      const res = await fetch(RAW_URL, { headers: { 'Accept': 'application/json' }, cache: 'no-store' });
      if (res.ok) {
        repoData = await res.json().catch(() => null);
      }
    } else {
      try {
        const filePath = path.join(process.cwd(), 'data', 'events.json');
        const buf = await fs.readFile(filePath, 'utf8');
        repoData = JSON.parse(buf);
      } catch {}
    }

    if (repoData?.events && Array.isArray(repoData.events)) {
      const events = repoData.events as CalendarEvent[];
      cached = { at: Date.now(), events };
      return NextResponse.json({ events }, { status: 200, headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=3600' } });
    }

    // Always include marketplace events
    const [poshEvents, stubhubEvents, llmEvents] = await Promise.all([
      fetchPoshEvents(),
      fetchStubhubEvents(),
      fetchFirecrawlEvents()
    ]);

    // Optionally include Firecrawl + LLM extracted events if credentials exist
    const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || process.env.FIRECRAWL_KEY || process.env.FIRECRAWL_TOKEN;
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY;

    let llmEvents: CalendarEvent[] = [];
    if (FIRECRAWL_API_KEY && OPENROUTER_API_KEY) {
      try {
        const firecrawl = new Firecrawl({ apiKey: FIRECRAWL_API_KEY });
        const sources = [
          'https://shotgun.live/en/cities/tampa',
          'https://dice.fm/browse/Tampa:27.947974:-82.457098'
        ];

        const results = await Promise.all(
          sources.map((url) =>
            firecrawl.scrape(url, {
              formats: ['markdown', 'links'],
              onlyMainContent: false,
              waitFor: 1500,
              timeout: 30000,
              maxAge: 0
            } as any).then((doc: any) => ({ url, markdown: doc?.markdown || '', links: doc?.links || [] }))
          )
        );

        const combinedMarkdown = results
          .map(r => `# SOURCE: ${r.url}\n\n${r.markdown}`)
          .join('\n\n---\n\n');

        const combinedLinks = results.flatMap(r => (Array.isArray(r.links) ? r.links : []));
        const linksJson = JSON.stringify(combinedLinks).slice(0, 15000);
        const markdown: string = combinedMarkdown;

        if (markdown) {
          const system = `You are an expert event parser. Extract a clean JSON array of events from the given markdown about Tampa events.
Rules:
- Output ONLY valid JSON, no prose.
- Each event must include: id (string), title (string), description (string, can be short), category (string), location (string), startDate (YYYY-MM-DD), startTime (string, e.g. 7:30 PM), url (string). URL is REQUIRED. If multiple candidate links exist, choose the event detail or ticket link.
- If only a date-time string is present, split into startDate and startTime.
- If month/day names are present without year, assume the next occurrence from today.
- For multi-day events, use the first date as startDate and startTime as the first start time you can find.
- Infer category from context (music, arts, business, technology, sports, networking, nightlife, festival, concert, theater, comedy, family) if possible.
- Location can be a venue or city; prefer venue if available.`;

          const user = `Markdown to parse (multi-source):\n\n${markdown.slice(0, 12000)}\n\nLINKS (JSON array of discovered links for reference):\n${linksJson}`;

          const completionRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://calendar-app.local',
              'X-Title': 'Calendar-App Event Extractor'
            },
            body: JSON.stringify({
              model: 'x-ai/grok-4-fast:free',
              temperature: 0,
              max_tokens: 2000,
              messages: [
                { role: 'system', content: system },
                { role: 'user', content: user }
              ]
            })
          });

          if (completionRes.ok) {
            const completionJson = await completionRes.json();
            const content: string = completionJson?.choices?.[0]?.message?.content || '[]';
            let extracted: ExtractedEvent[] = [];
            try {
              extracted = JSON.parse(content);
              if (!Array.isArray(extracted)) extracted = [];
            } catch {
              extracted = [];
            }
            llmEvents = extracted.map((e, idx) => ({
              id: idx + 1,
              title: e.title || 'Untitled Event',
              date: (e.startDate || '').slice(0, 10),
              time: e.startTime || '',
              location: e.location || 'Tampa, FL',
              category: normalizeCategory(e.category),
              description: e.description || '',
              url: sanitizeUrl(e.url)
            })).filter(ev => ev.date);
          }
        }
      } catch {
        // Ignore LLM pipeline errors and proceed with Posh events only
      }
    }

    // Merge and dedupe events
    const merged = dedupeEvents([...poshEvents, ...stubhubEvents, ...llmEvents]);

    cached = { at: Date.now(), events: merged };
    return NextResponse.json({ events: merged }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}

function normalizeCategory(cat?: string): string {
  const c = (cat || '').toLowerCase();
  const known = ['business','technology','arts','music','sports','networking','nightlife','festival','concert','theater','comedy','family'];
  for (const k of known) {
    if (c.includes(k)) return k;
  }
  return 'music';
}

function sanitizeUrl(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url, 'https://example.com');
    // If relative, ignore the base assignment above
    if (!/^https?:/i.test(url)) return undefined;
    return u.toString();
  } catch {
    return undefined;
  }
}

// Fetch Posh.vip events with pagination rules:
// - First request: omit cursor
// - From second request: include cursor, starting at 6 and increment by 6
async function fetchPoshEvents(): Promise<CalendarEvent[]> {
  const baseUrl = 'https://posh.vip/api/web/v2/trpc/events.fetchMarketplaceEvents';

  const baseInput = {
    sort: 'Trending',
    when: 'This Month',
    search: '',
    location: { type: 'custom', location: 'Tampa, FL, USA', lat: 27.9516896, long: -82.45875269999999 },
    secondaryFilters: [] as any[],
    where: 'Tampa, FL, USA',
    coordinates: [-82.45875269999999, 27.9516896] as [number, number],
    limit: 6,
    clientTimezone: 'America/New_York' as const
  } as const;

  const cursors: Array<number | undefined> = [undefined, 6, 12]; // fetch up to 18 events by default

  const pages: Array<{ events: any[]; nextCursor?: number }> = [];
  for (const cursor of cursors) {
    const inputObj: Record<string, any> = { ...baseInput };
    if (typeof cursor === 'number') inputObj.cursor = cursor;
    const url = `${baseUrl}?input=${encodeURIComponent(JSON.stringify(inputObj))}`;
    const res = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' }, cache: 'no-store' });
    if (!res.ok) break;
    const data = await res.json().catch(() => null);
    const events: any[] = data?.result?.data?.events || [];
    const nextCursor: number | undefined = data?.result?.data?.nextCursor;
    pages.push({ events, nextCursor });
    if (!nextCursor) break;
  }

  const flattened = pages.flatMap(p => p.events);
  const mapped: CalendarEvent[] = flattened.map((ev: any, idx: number) => {
    const { date, time } = toNYDateParts(ev?.startUtc);
    const url = ev?.url ? `https://posh.vip/e/${ev.url}` : undefined;
    const location = ev?.venue?.name || ev?.venue?.address || 'Tampa, FL';
    const description = typeof ev?.shortDescription === 'string' ? ev.shortDescription : '';
    return {
      id: idx + 1,
      title: String(ev?.name || 'Untitled Event'),
      date,
      time,
      location,
      category: 'music',
      description,
      url: sanitizeUrl(url)
    };
  }).filter(e => e.date);

  return mapped;
}

async function fetchStubhubEvents(): Promise<CalendarEvent[]> {
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    console.warn('StubHub headless launch failed:', (err as Error)?.message || err);
    return [];
  }

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();

  try {
    await page.goto('https://www.stubhub.com/concert-tickets/category/1', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const cookies = await context.cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
    const userAgent = await page.evaluate(() => navigator.userAgent);

    const headers: Record<string, string> = {
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'User-Agent': userAgent,
      Referer: 'https://www.stubhub.com/concert-tickets/category/1',
      Origin: 'https://www.stubhub.com',
      'X-Requested-With': 'XMLHttpRequest'
    };
    if (cookieHeader) {
      headers.Cookie = cookieHeader;
    }

    const collected: any[] = [];
    const maxPages = 6;
    for (let pageIndex = 1; pageIndex <= maxPages; pageIndex += 1) {
      const params = new URLSearchParams({
        method: 'getExploreEvents',
        lat: 'MjcuOTUxNjg5Ng==',
        lon: 'LTgyLjQ1ODc1MjY5OTk5OTk5',
        page: String(pageIndex),
        tlcId: '3'
      });
      const url = `https://www.stubhub.com/concert-tickets/category/1?${params.toString()}`;

      const response = await context.request.get(url, { headers });
      if (!response.ok()) {
        console.warn('StubHub headless request failed with status', response.status());
        break;
      }

      const payload = await response.json().catch(() => null);
      const events = Array.isArray(payload?.events) ? payload.events : [];
      if (events.length === 0) {
        break;
      }

      collected.push(...events);

      const remaining = Number(payload?.remaining ?? 0);
      if (!Number.isFinite(remaining) || remaining <= 0) {
        break;
      }
    }

    return collected
      .map((ev, idx) => toStubhubCalendarEvent(ev, idx))
      .filter((ev): ev is CalendarEvent => Boolean(ev));
  } catch (err) {
    console.warn('StubHub browser workflow failed:', (err as Error)?.message || err);
    return [];
  } finally {
    await browser.close().catch(() => {});
  }
}

function toStubhubCalendarEvent(raw: any, idx: number): CalendarEvent | null {
  const title = typeof raw?.name === 'string' && raw.name.trim() ? raw.name.trim() : 'Untitled Event';
  const date = parseStubhubDate(raw);
  if (!date) return null;

  const time = parseStubhubTime(raw?.formattedTime);
  const location = formatStubhubLocation(raw);
  const description = formatStubhubDescription(raw);
  const url = sanitizeUrl(raw?.url);

  return {
    id: idx + 1,
    title,
    date,
    time,
    location,
    category: 'music',
    description,
    url
  };
}

function parseStubhubDate(raw: any): string {
  const url = typeof raw?.url === 'string' ? raw.url : '';
  const urlMatch = url.match(/-(\d{1,2})-(\d{1,2})-(\d{4})(?:\b|\/)/);
  if (urlMatch) {
    const [, monthStr, dayStr, yearStr] = urlMatch;
    return `${yearStr}-${monthStr.padStart(2, '0')}-${dayStr.padStart(2, '0')}`;
  }

  const formatted = typeof raw?.formattedDateWithoutYear === 'string' ? raw.formattedDateWithoutYear.trim() : '';
  const yearFromName = extractYear(raw?.name);
  const monthDay = formatted.split(/\s+/);
  if (monthDay.length >= 2) {
    const month = monthNameToNumber(monthDay[0]);
    const day = parseInt(monthDay[1], 10);
    if (month && day) {
      let year = yearFromName ?? new Date().getFullYear();
      let iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const today = new Date();
      const todayIso = today.toISOString().slice(0, 10);
      if (iso < todayIso) {
        iso = `${year + 1}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
      return iso;
    }
  }

  return '';
}

function parseStubhubTime(rawTime: any): string {
  if (typeof rawTime !== 'string') return '';
  const time = rawTime.trim();
  if (!time) return '';
  if (/^\d{1,2}:\d{2}\s?(AM|PM)$/i.test(time)) {
    const [h, rest] = time.split(':');
    const minutesAndPeriod = rest.trim().toUpperCase();
    return `${String(parseInt(h, 10))}:${minutesAndPeriod}`;
  }
  if (/^\d{1,2}\s?(AM|PM)$/i.test(time)) {
    const parts = time.split(/\s+/);
    return `${parseInt(parts[0], 10)} ${parts[1].toUpperCase()}`;
  }
  return '';
}

function formatStubhubLocation(raw: any): string {
  if (typeof raw?.venueName === 'string' && raw.venueName.trim()) {
    return raw.venueName.trim();
  }
  if (typeof raw?.formattedVenueLocation === 'string' && raw.formattedVenueLocation.trim()) {
    return raw.formattedVenueLocation.trim();
  }
  return 'Tampa, FL';
}

function formatStubhubDescription(raw: any): string {
  const parts: string[] = [];
  if (typeof raw?.dayOfWeek === 'string' && raw.dayOfWeek.trim()) parts.push(raw.dayOfWeek.trim());
  if (typeof raw?.formattedDateWithoutYear === 'string' && raw.formattedDateWithoutYear.trim()) parts.push(raw.formattedDateWithoutYear.trim());
  if (typeof raw?.formattedVenueLocation === 'string' && raw.formattedVenueLocation.trim()) parts.push(raw.formattedVenueLocation.trim());
  return parts.join(' • ');
}

function extractYear(value: any): number | null {
  if (typeof value !== 'string') return null;
  const match = value.match(/(20\d{2})/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

function monthNameToNumber(month: string): number | null {
  const lookup: Record<string, number> = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12,
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    sept: 9,
    oct: 10,
    nov: 11,
    dec: 12
  };
  const key = month.toLowerCase();
  return lookup[key] ?? null;
}

function toNYDateParts(iso?: string): { date: string; time: string } {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  } as any).format(d);
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  } as any).format(d);
  return { date, time };
}

function dedupeEvents(events: CalendarEvent[]): CalendarEvent[] {
  const seen = new Set<string>();
  const out: CalendarEvent[] = [];
  for (const ev of events) {
    const key = `${(ev.title || '').toLowerCase()}|${ev.date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ev);
  }
  return out;
}


