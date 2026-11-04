/**
 * Money helpers. All arithmetic in the app is done in integer minor units
 * (cents, haléř, Rappen, ...) to avoid floating point drift. Floats only exist at
 * the edges: user input and exchange rates.
 */

/** ISO 4217 minor-unit exponents for currencies that differ from the default of 2. */
const MINOR_DIGITS: Record<string, number> = {
  JPY: 0,
  KRW: 0,
  ISK: 0,
  IDR: 0,
  CLP: 0,
  VND: 0,
  HUF: 2,
  BHD: 3,
  KWD: 3,
  JOD: 3,
};

/** Currencies supported by the Frankfurter API (ECB reference rates). */
export const CURRENCIES = [
  'EUR', 'USD', 'GBP', 'CHF', 'CZK', 'PLN', 'HUF', 'SEK', 'NOK', 'DKK', 'ISK', 'RON', 'BGN', 'TRY',
  'CNY', 'HKD', 'JPY', 'KRW', 'SGD', 'THB', 'MYR', 'IDR', 'PHP', 'INR', 'AUD', 'NZD', 'CAD',
  'MXN', 'BRL', 'ZAR', 'ILS',
] as const;

export function minorDigits(currency: string): number {
  return MINOR_DIGITS[currency.toUpperCase()] ?? 2;
}

/**
 * Round half away from zero, after first snapping away float noise
 * (e.g. 1.005 * 100 = 100.49999999999999 should round to 101).
 */
export function roundHalfAwayFromZero(x: number): number {
  const cleaned = Number(x.toPrecision(12));
  const r = Math.round(Math.abs(cleaned));
  return cleaned < 0 ? -r : r;
}

export function toMinor(amount: number, currency: string): number {
  return roundHalfAwayFromZero(amount * 10 ** minorDigits(currency));
}

export function fromMinor(minor: number, currency: string): number {
  return minor / 10 ** minorDigits(currency);
}

/**
 * Convert an amount (minor units of `from`) to minor units of the base currency,
 * using `rate` = how many base units one unit of `from` is worth. Rounded once.
 */
export function convertMinor(amountMinor: number, from: string, rate: number, base: string): number {
  const scale = 10 ** (minorDigits(base) - minorDigits(from));
  return roundHalfAwayFromZero(amountMinor * rate * scale);
}

const formatters = new Map<string, Intl.NumberFormat>();

export function formatMoney(minor: number, currency: string, locale = 'en'): string {
  const key = `${locale}|${currency}`;
  let f = formatters.get(key);
  if (!f) {
    const d = minorDigits(currency);
    f = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    });
    formatters.set(key, f);
  }
  // Avoid "-€0.00"
  const value = fromMinor(minor, currency);
  return f.format(value === 0 ? 0 : value);
}

/** Excel number format for a currency, e.g. '#,##0.00 "EUR"'. */
export function excelFormat(currency: string): string {
  const d = minorDigits(currency);
  return `#,##0${d > 0 ? '.' + '0'.repeat(d) : ''} "${currency}"`;
}
