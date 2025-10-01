import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { Firecrawl } from '@mendable/firecrawl-js';

async function safeFetchJson(url, options = {}) {
  try {
    const res = await fetch(url, { ...options, headers: { 'Accept': 'application/json', ...(options.headers || {}) } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function toNYDateParts(iso) {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  const time = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', hour12: true }).format(d);
  return { date, time };
}

function sanitizeUrl(url) {
  if (!url) return undefined;
  try {
    const u = new URL(url, 'https://example.com');
    if (!/^https?:/i.test(url)) return undefined;
    return u.toString();
  } catch {
    return undefined;
  }
}

function normalizeCategory(cat) {
  const c = (cat || '').toLowerCase();
  const known = ['business','technology','arts','music','sports','networking','nightlife','festival','concert','theater','comedy','family'];
  for (const k of known) {
    if (c.includes(k)) return k;
  }
  return 'music';
}

async function fetchPoshEvents() {
  const baseUrl = 'https://posh.vip/api/web/v2/trpc/events.fetchMarketplaceEvents';
  const baseInput = {
    sort: 'Trending',
    when: 'This Month',
    search: '',
    location: { type: 'custom', location: 'Tampa, FL, USA', lat: 27.9516896, long: -82.45875269999999 },
    secondaryFilters: [],
    where: 'Tampa, FL, USA',
    coordinates: [-82.45875269999999, 27.9516896],
    limit: 6,
    clientTimezone: 'America/New_York'
  };

  const cursors = [undefined, 6, 12];
  const pages = [];
  for (const cursor of cursors) {
    const inputObj = { ...baseInput };
    if (typeof cursor === 'number') inputObj.cursor = cursor;
    const url = `${baseUrl}?input=${encodeURIComponent(JSON.stringify(inputObj))}`;
    const data = await safeFetchJson(url);
    const events = data?.result?.data?.events || [];
    const nextCursor = data?.result?.data?.nextCursor;
    pages.push({ events, nextCursor });
    if (!nextCursor) break;
  }

  const flattened = pages.flatMap(p => p.events);
  const mapped = flattened.map((ev, idx) => {
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

function parseStubhubTime(rawTime) {
  if (typeof rawTime !== 'string') return '';
  const time = rawTime.trim();
  if (!time) return '';
  if (/^\d{1,2}:\d{2}\s?(AM|PM)$/i.test(time)) {
    const [h, rest] = time.split(':');
    const minutesAndPeriod = rest.trim().toUpperCase();
    return `${String(Number.parseInt(h, 10))}:${minutesAndPeriod}`;
  }
  if (/^\d{1,2}\s?(AM|PM)$/i.test(time)) {
    const parts = time.split(/\s+/);
    return `${Number.parseInt(parts[0], 10)} ${parts[1].toUpperCase()}`;
  }
  return '';
}

function formatStubhubLocation(raw) {
  if (typeof raw?.venueName === 'string' && raw.venueName.trim()) {
    return raw.venueName.trim();
  }
  if (typeof raw?.formattedVenueLocation === 'string' && raw.formattedVenueLocation.trim()) {
    return raw.formattedVenueLocation.trim();
  }
  return 'Tampa, FL';
}

function formatStubhubDescription(raw) {
  const parts = [];
  if (typeof raw?.dayOfWeek === 'string' && raw.dayOfWeek.trim()) parts.push(raw.dayOfWeek.trim());
  if (typeof raw?.formattedDateWithoutYear === 'string' && raw.formattedDateWithoutYear.trim()) parts.push(raw.formattedDateWithoutYear.trim());
  if (typeof raw?.formattedVenueLocation === 'string' && raw.formattedVenueLocation.trim()) parts.push(raw.formattedVenueLocation.trim());
  return parts.join(' • ');
}

function extractYear(value) {
  if (typeof value !== 'string') return null;
  const match = value.match(/(20\d{2})/);
  if (!match) return null;
  return Number.parseInt(match[1], 10);
}

function monthNameToNumber(month) {
  const lookup = {
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

function parseStubhubDate(raw) {
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
    const day = Number.parseInt(monthDay[1], 10);
    if (month && day) {
      let year = yearFromName ?? new Date().getFullYear();
      let iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const today = new Date().toISOString().slice(0, 10);
      if (iso < today) {
        iso = `${year + 1}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
      return iso;
    }
  }

  return '';
}

function toStubhubEvent(raw, idx) {
  const title = typeof raw?.name === 'string' && raw.name.trim() ? raw.name.trim() : 'Untitled Event';
  const date = parseStubhubDate(raw);
  if (!date) return null;

  return {
    id: idx + 1,
    title,
    date,
    time: parseStubhubTime(raw?.formattedTime),
    location: formatStubhubLocation(raw),
    category: 'music',
    description: formatStubhubDescription(raw),
    url: sanitizeUrl(raw?.url)
  };
}

async function fetchStubhubEvents() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
  });
  const page = await context.newPage();

  try {
    await page.goto('https://www.stubhub.com/concert-tickets/category/1', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const cookies = await context.cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
    const headers = {
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'User-Agent': await page.evaluate(() => navigator.userAgent),
      Referer: 'https://www.stubhub.com/concert-tickets/category/1',
      Origin: 'https://www.stubhub.com',
      'X-Requested-With': 'XMLHttpRequest',
      Cookie: cookieHeader
    };

    const collected = [];
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

      const result = await context.request.get(url, { headers });
      if (!result.ok()) {
        console.warn('StubHub browser request failed with status', result.status());
        break;
      }

      let json;
      try {
        json = await result.json();
      } catch {
        console.warn('StubHub browser request returned non-JSON payload');
        break;
      }

      const events = Array.isArray(json?.events) ? json.events : [];
      collected.push(...events);

      const remaining = Number(json?.remaining ?? 0);
      if (!Number.isFinite(remaining) || remaining <= 0) {
        break;
      }
    }

    return collected
      .map((ev, idx) => toStubhubEvent(ev, idx))
      .filter(Boolean);
  } catch (err) {
    console.warn('StubHub browser workflow failed:', err?.message || err);
    return [];
  } finally {
    await browser.close();
  }
}

async function fetchFirecrawlEvents() {
  const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || process.env.FIRECRAWL_KEY || process.env.FIRECRAWL_TOKEN;
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY;
  if (!FIRECRAWL_API_KEY || !OPENROUTER_API_KEY) {
    return [];
  }

  try {
    const firecrawl = new Firecrawl({ apiKey: FIRECRAWL_API_KEY });
    const sunsetPages = Array.from({ length: 5 }, (_, i) => `https://www.sunsettampa.com/events/page/${i + 1}/`);
    const sources = [
      'https://shotgun.live/en/cities/tampa',
      'https://dice.fm/browse/Tampa:27.947974:-82.457098',
      ...sunsetPages
    ];

    const results = await Promise.all(
      sources.map(async (url) => {
        try {
          const doc = await firecrawl.scrape(url, {
            formats: ['markdown', 'links'],
            onlyMainContent: false,
            waitFor: 1500,
            timeout: 30000,
            maxAge: 0
          });
          return { url, markdown: doc?.markdown || '', links: Array.isArray(doc?.links) ? doc.links : [] };
        } catch (err) {
          console.warn(`Firecrawl scrape failed for ${url}:`, err?.message || err);
          return { url, markdown: '', links: [] };
        }
      })
    );

    const combinedMarkdown = results
      .map((r) => (r.markdown ? `# SOURCE: ${r.url}\n\n${r.markdown}` : ''))
      .filter(Boolean)
      .join('\n\n---\n\n');

    if (!combinedMarkdown) return [];

    const combinedLinks = results.flatMap((r) => r.links);
    const linksJson = JSON.stringify(combinedLinks).slice(0, 15000);

    const system = `You are an expert event parser. Extract a clean JSON array of events from the given markdown about Tampa events.
Rules:
- Output ONLY valid JSON, no prose.
- Each event must include: id (string), title (string), description (string, can be short), category (string), location (string), startDate (YYYY-MM-DD), startTime (string, e.g. 7:30 PM), url (string). URL is REQUIRED. If multiple candidate links exist, choose the event detail or ticket link.
- If only a date-time string is present, split into startDate and startTime.
- If month/day names are present without year, assume the next occurrence from today.
- For multi-day events, use the first date as startDate and startTime as the first start time you can find.
- Infer category from context (music, arts, business, technology, sports, networking, nightlife, festival, concert, theater, comedy, family) if possible.
- Location can be a venue or city; prefer venue if available.`;

    const user = `Markdown to parse (multi-source):\n\n${combinedMarkdown.slice(0, 12000)}\n\nLINKS (JSON array of discovered links for reference):\n${linksJson}`;

    const completionRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
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

    if (!completionRes.ok) {
      console.warn('OpenRouter completion failed with status', completionRes.status);
      return [];
    }

    let content = '[]';
    try {
      const completionJson = await completionRes.json();
      content = completionJson?.choices?.[0]?.message?.content || '[]';
    } catch (err) {
      console.warn('Failed to parse OpenRouter response JSON', err);
      return [];
    }

    let extracted = [];
    try {
      extracted = JSON.parse(content);
      if (!Array.isArray(extracted)) extracted = [];
    } catch (err) {
      console.warn('LLM output was not valid JSON', err);
      return [];
    }

    return extracted
      .map((e, idx) => ({
        id: idx + 1,
        title: e.title || 'Untitled Event',
        date: (e.startDate || '').slice(0, 10),
        time: e.startTime || '',
        location: e.location || 'Tampa, FL',
        category: normalizeCategory(e.category),
        description: e.description || '',
        url: sanitizeUrl(e.url)
      }))
      .filter((ev) => ev.date);
  } catch (err) {
    console.warn('Firecrawl pipeline failed:', err?.message || err);
    return [];
  }
}

function dedupeEvents(events) {
  const seen = new Set();
  const out = [];
  for (const ev of events) {
    const key = `${(ev.title || '').toLowerCase()}|${ev.date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ev);
  }
  return out;
}

async function main() {
  const [posh, stubhub, llmEvents] = await Promise.all([
    fetchPoshEvents(),
    fetchStubhubEvents(),
    fetchFirecrawlEvents()
  ]);

  if (stubhub.length === 0) {
    console.warn('StubHub events unavailable; repository JSON may be missing StubHub data.');
  }
  if (llmEvents.length === 0) {
    console.warn('Dice/Shotgun events unavailable (Firecrawl or OpenRouter missing/failing).');
  }

  const merged = dedupeEvents([...posh, ...stubhub, ...llmEvents]);
  const payload = { events: merged, lastUpdated: new Date().toISOString() };

  const outDir = path.join(process.cwd(), 'data');
  const outFile = path.join(outDir, 'events.json');
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outFile, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`Wrote ${outFile}`);

  const publicDir = path.join(process.cwd(), 'public', 'data');
  const publicFile = path.join(publicDir, 'events.json');
  await fs.mkdir(publicDir, { recursive: true });
  await fs.writeFile(publicFile, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`Wrote ${publicFile}`);
}

await main();


