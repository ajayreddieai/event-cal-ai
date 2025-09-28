import fs from 'node:fs/promises';
import path from 'node:path';

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
  const posh = await fetchPoshEvents();
  // Future: optionally add Firecrawl + LLM if secrets are provided (skipped here for repo safety)
  const merged = dedupeEvents(posh);
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


