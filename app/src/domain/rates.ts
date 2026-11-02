/**
 * Exchange rates from the free Frankfurter API (ECB reference rates).
 *
 * We always request the EUR-based table for a date and derive cross rates from it,
 * instead of asking Frankfurter for e.g. CZK->EUR directly. That avoids a second
 * rounding step (Frankfurter rounds cross rates to ~5 significant digits, which is
 * noticeable for currencies like CZK or JPY).
 *
 * Tables are cached in localStorage per date: historical ECB rates never change.
 */

const API = 'https://api.frankfurter.app';
const CACHE_KEY = 'tripsplit.rates.v1';

interface RateTable {
  /** The ECB reference date actually returned (weekends/holidays fall back to the previous business day). */
  date: string;
  /** units of currency per 1 EUR */
  rates: Record<string, number>;
}

export interface FetchedRate {
  rate: number;
  rateDate: string;
}

function readCache(): Record<string, RateTable> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeCache(cache: Record<string, RateTable>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* storage full or unavailable — caching is best effort */
  }
}

/** Round to 8 significant digits — plenty for money, and stable when serialised. */
export function roundRate(x: number): number {
  return Number(x.toPrecision(8));
}

/** Cross rate: how many `to` one unit of `from` is worth, from a EUR-based table. */
export function crossRate(table: Record<string, number>, from: string, to: string): number {
  const perEur = (c: string) => (c === 'EUR' ? 1 : table[c]);
  const f = perEur(from);
  const t = perEur(to);
  if (!f || !t) throw new Error(`No ECB rate for ${!f ? from : to}`);
  return roundRate(t / f);
}

export function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function getTable(date: string, fetchImpl: typeof fetch): Promise<RateTable> {
  // Future dates have no rate yet; use the latest published one.
  const key = date > todayISO() ? 'latest' : date;
  const cache = readCache();
  // 'latest' and today's table can still change, so only trust the cache for past dates.
  if (key !== 'latest' && key !== todayISO() && cache[key]) return cache[key];

  const res = await fetchImpl(`${API}/${key}?from=EUR`);
  if (!res.ok) throw new Error(`Frankfurter API error ${res.status}`);
  const json = (await res.json()) as { date: string; rates: Record<string, number> };
  const table: RateTable = { date: json.date, rates: json.rates };
  if (key !== 'latest') {
    cache[key] = table;
    writeCache(cache);
  }
  return table;
}

/**
 * Get the rate to convert `from` into `to` for a given date.
 * Throws if offline, the API fails, or a currency is unsupported — the UI then asks
 * for a manual rate.
 */
export async function fetchRate(
  date: string,
  from: string,
  to: string,
  fetchImpl: typeof fetch = fetch.bind(globalThis),
): Promise<FetchedRate> {
  if (from === to) return { rate: 1, rateDate: date };
  const table = await getTable(date, fetchImpl);
  return { rate: crossRate(table.rates, from, to), rateDate: table.date };
}
