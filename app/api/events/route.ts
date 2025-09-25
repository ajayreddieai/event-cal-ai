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
};

const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes
let cached: { at: number; events: CalendarEvent[] } | null = null;

export async function GET() {
  try {
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return NextResponse.json({ events: cached.events }, { status: 200 });
    }

    const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || process.env.FIRECRAWL_KEY || process.env.FIRECRAWL_TOKEN;
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY;

    if (!FIRECRAWL_API_KEY) {
      return NextResponse.json({ error: 'Missing FIRECRAWL_API_KEY' }, { status: 500 });
    }
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'Missing OPENROUTER_API_KEY' }, { status: 500 });
    }

    const firecrawl = new Firecrawl({ apiKey: FIRECRAWL_API_KEY });

    const url = 'https://shotgun.live/en/cities/tampa';
    const doc = await firecrawl.scrape(url, {
      formats: ['markdown'],
      onlyMainContent: false,
      waitFor: 1200,
      timeout: 25000,
      maxAge: 0
    } as any);

    const markdown: string = doc?.markdown || '';
    if (!markdown) {
      return NextResponse.json({ events: [] }, { status: 200 });
    }

    const system = `You are an expert event parser. Extract a clean JSON array of events from the given markdown about Tampa events.
Rules:
- Output ONLY valid JSON, no prose.
- Each event must include: id (string), title (string), description (string, can be short), category (string), location (string), startDate (YYYY-MM-DD), startTime (string, e.g. 7:30 PM), url (string if present).
- If only a date-time string is present, split into startDate and startTime.
- If month/day names are present without year, assume the next occurrence from today.
- For multi-day events, use the first date as startDate and startTime as the first start time you can find.
- Infer category from context (music, arts, business, technology, sports, networking, nightlife, festival, concert, theater, comedy, family) if possible.
- Location can be a venue or city; prefer venue if available.`;

    const user = `Markdown to parse:\n\n${markdown.slice(0, 15000)}`; // cap to avoid token overrun

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

    if (!completionRes.ok) {
      const text = await completionRes.text();
      return NextResponse.json({ error: 'OpenRouter request failed', details: text }, { status: 500 });
    }

    const completionJson = await completionRes.json();
    const content: string = completionJson?.choices?.[0]?.message?.content || '[]';

    let extracted: ExtractedEvent[] = [];
    try {
      extracted = JSON.parse(content);
      if (!Array.isArray(extracted)) extracted = [];
    } catch {
      extracted = [];
    }

    // Map extracted events into calendar events format
    const events: CalendarEvent[] = extracted.map((e, idx) => ({
      id: idx + 1,
      title: e.title || 'Untitled Event',
      date: (e.startDate || '').slice(0, 10),
      time: e.startTime || '',
      location: e.location || 'Tampa, FL',
      category: normalizeCategory(e.category),
      description: e.description || ''
    })).filter(ev => ev.date);

    cached = { at: Date.now(), events };
    return NextResponse.json({ events }, { status: 200 });
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


