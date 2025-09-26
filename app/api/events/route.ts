import { NextResponse } from 'next/server';
import { Firecrawl } from '@mendable/firecrawl-js';

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

    // Always include Posh.vip marketplace events
    const poshEvents = await fetchPoshEvents();

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
    const merged = dedupeEvents([...poshEvents, ...llmEvents]);

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


