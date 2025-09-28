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
  const baseUrl = 'https://www.stubhub.com/concert-tickets/category/1';
  const params = new URLSearchParams({
    method: 'getExploreEvents',
    lat: 'MjcuOTUxNjg5Ng==',
    lon: 'LTgyLjQ1ODc1MjY5OTk5OTk5',
    tlcId: '3'
  });

  const sessionCookie = 'wsso-session=eyJ1bCI6bnVsbCwidXBsIjp7ImN0IjoiVVMiLCJuIjoiVGFtcGEiLCJsdCI6MjcuOTUxNjg5NiwibGciOi04Mi40NTg3NTI2OTk5OTk5OSwic3JjIjoiVVNFUl9TRUxFQ1RJT04ifSwiZCI6bnVsbCwicnYiOnsiYyI6W10sImUiOltdLCJsIjpbXSwicnRjX3UiOm51bGwsInJ0Y19ldCI6IjIwMjUtMDktMjhUMDM6MTU6MTguNzkyMzc2WiJ9LCJmYyI6eyJjIjpbXX0sInAiOltdLCJpZCI6bnVsbH0=; wsso=eyJ1bCI6bnVsbCwidXBsIjp7Im4iOiJOZXcgWW9yayIsInMiOmZhbHNlLCJsZyI6LTc0LjAwNiwibHQiOjQwLjcxMywiY3QiOiJVUyIsInNyYyI6IlVTRVJfU0VMRUNUSU9OIiwiZHQiOiIwMDAxLTAxLTAxVDAwOjAwOjAwKzAwOjAwIn0sImQiOnsidHlw…HjpkBAAA; auths=0; ulv-ed-event=eyIxNTkxMDkzNzIiOlsxNzU5MDI5NDE5MjI4XX0=; forterToken=af0744c30c6f4bf0ba16661127323c3f_1759029419416_271_UAS9_24ck; lastRskxRun=1759029419708; rskxRunCookie=0; rCookie=iza24s4nvegdof6x60myemg34p6t8; aws-waf-token=fa23dfc5-0828-4efa-81fd-5b59b0a24fec:EwoAmZUkhpZqAAAA:yZ4ShlfktsOskwnAoZDe5ZBMyW1n9DVZI73N9iOl4xUv2dP0HgNJIzK9KIhfP3qXz3GtfOQxiPMCXWkd/AvAk+ioxpzPqRl5DOrvqOKD5N2TKK8gVruCd4g4NFyT6EXWyAzVSEReW410Cm+D9dvTLaWtCcTgyA0tpJohOO6XLubLKyD5gXqTpxU1QQ95YNIFlFRoVmL7TtCJX+0QXA==';

  const headers = {
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    Referer: 'https://www.stubhub.com/concert-tickets/category/1',
    Origin: 'https://www.stubhub.com',
    'X-Requested-With': 'XMLHttpRequest'
  };

  if (sessionCookie) {
    headers.Cookie = sessionCookie;
  }

  const collected = [];
  const maxPages = 6;
  for (let page = 1; page <= maxPages; page += 1) {
    params.set('page', String(page));
    const url = `${baseUrl}?${params.toString()}`;

    let res;
    try {
      res = await fetch(url, { headers, cache: 'no-store' });
    } catch {
      console.warn('StubHub request failed at network level');
      break;
    }

    const wafAction = res.headers?.get?.('x-amzn-waf-action');
    if (!res.ok || res.status === 202 || wafAction === 'challenge') {
      console.warn(`StubHub blocked request (status=${res.status}, waf=${wafAction || 'none'})`);
      break;
    }

    let data = null;
    try {
      data = await res.json();
    } catch {
      console.warn('StubHub response was not JSON');
      break;
    }

    const events = Array.isArray(data?.events) ? data.events : [];
    if (!events.length) {
      break;
    }

    collected.push(...events);

    const remaining = Number(data?.remaining ?? 0);
    if (!Number.isFinite(remaining) || remaining <= 0) {
      break;
    }
  }

  return collected
    .map((ev, idx) => toStubhubEvent(ev, idx))
    .filter(Boolean);
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
  const [posh, stubhub] = await Promise.all([fetchPoshEvents(), fetchStubhubEvents()]);
  if (stubhub.length === 0) {
    console.warn('StubHub events unavailable; repository JSON will contain only Posh data.');
  }
  // Future: optionally add Firecrawl + LLM if secrets are provided (skipped here for repo safety)
  const merged = dedupeEvents([...posh, ...stubhub]);
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


