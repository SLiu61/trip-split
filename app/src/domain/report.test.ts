import { describe, expect, it, vi } from 'vitest';
import { buildSheets } from './export';
import { crossRate, fetchRate } from './rates';
import { makeSampleTrip } from './sample';
import { buildReport } from './summary';
import { makeT } from '../i18n/messages';

describe('sample trip', () => {
  const trip = makeSampleTrip();
  const r = buildReport(trip);

  it('has 4 members and EUR / CHF / CZK expenses', () => {
    expect(trip.members).toHaveLength(4);
    expect(new Set(trip.expenses.map((e) => e.currency))).toEqual(new Set(['EUR', 'CHF', 'CZK']));
  });

  it('passes every reconciliation check', () => {
    expect(r.checks).toEqual({ sharesEqualTotal: true, balancesSumToZero: true, transfersSettleAll: true });
  });

  it('settles 4 people in at most 3 transfers', () => {
    expect(r.transfers.length).toBeGreaterThan(0);
    expect(r.transfers.length).toBeLessThanOrEqual(3);
  });

  it('category totals add up to the trip total', () => {
    expect(r.byCategory.reduce((s, c) => s + c.total, 0)).toBe(r.total);
    expect(r.byCurrency.reduce((s, c) => s + c.baseTotal, 0)).toBe(r.total);
  });

  it('is reproducible (snapshot of balances)', () => {
    expect(r.balances.map((b) => b.net)).toMatchInlineSnapshot(`
      [
        -4248,
        -15540,
        12891,
        6897,
      ]
    `);
  });
});

describe('excel sheets', () => {
  const trip = makeSampleTrip();
  const sheets = buildSheets(trip, makeT('en'), new Date('2025-07-01T10:00:00Z'));

  it('contains the four required sheets', () => {
    expect(sheets.map((s) => s.name)).toEqual(['Expenses', 'Balances', 'Settlement transfers', 'Summary']);
  });

  it('expenses sheet has one row per expense plus header and total, with per-member columns', () => {
    const ex = sheets[0];
    expect(ex.rows).toHaveLength(trip.expenses.length + 2);
    expect(ex.rows[0]).toContain('Mia share (EUR)');
    expect(ex.rows[0]).toContain('Rate (1 unit → EUR)');
    const chfRow = ex.rows.find((row) => row[5] === 'CHF')!;
    expect(chfRow[7]).toBe('ECB (Frankfurter)');
  });

  it('per-member share columns sum to the base amount on every row', () => {
    const ex = sheets[0];
    const n = trip.members.length;
    for (const row of ex.rows.slice(1)) {
      const val = (c: unknown) => (c && typeof c === 'object' ? (c as { v: number }).v : 0);
      const shares = row.slice(-n).reduce((s: number, c) => s + val(c), 0);
      expect(shares).toBeCloseTo(val(row[9]), 6);
    }
  });

  it('localises headers', () => {
    const zh = buildSheets(trip, makeT('zh'));
    expect(zh[1].rows[0][0]).toBe('成员');
    expect(zh[1].name).toBe('Balances');
  });
});

describe('rates', () => {
  it('derives cross rates from the EUR table', () => {
    const table = { CHF: 0.9393, CZK: 24.782 };
    expect(crossRate(table, 'CHF', 'EUR')).toBe(1.0646226);
    expect(crossRate(table, 'EUR', 'CZK')).toBe(24.782);
    expect(crossRate(table, 'CHF', 'CZK')).toBe(26.383477);
    expect(() => crossRate(table, 'XYZ', 'EUR')).toThrow();
  });

  it('fetches the ECB table for the date and reports the actual reference date', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ amount: 1, base: 'EUR', date: '2025-06-06', rates: { CZK: 24.782, CHF: 0.9393 } })),
    );
    const r = await fetchRate('2025-06-08', 'CZK', 'EUR', fetchMock as unknown as typeof fetch);
    expect(fetchMock).toHaveBeenCalledWith('https://api.frankfurter.app/2025-06-08?from=EUR');
    expect(r).toEqual({ rate: 0.040351868, rateDate: '2025-06-06' });
  });

  it('needs no request for same-currency expenses', async () => {
    const fetchMock = vi.fn();
    expect(await fetchRate('2025-06-08', 'EUR', 'EUR', fetchMock as unknown as typeof fetch)).toEqual({ rate: 1, rateDate: '2025-06-08' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('surfaces API errors', async () => {
    const fetchMock = vi.fn(async () => new Response('nope', { status: 500 }));
    await expect(fetchRate('2025-06-09', 'CHF', 'EUR', fetchMock as unknown as typeof fetch)).rejects.toThrow();
  });
});

describe('exportFileName', () => {
  it('keeps letters in any script and drops symbols', async () => {
    const { exportFileName } = await import('./export');
    const t = makeSampleTrip();
    expect(exportFileName(t)).toBe('Vienna-Prague-Zurich-2025-TripSplit.xlsx');
    expect(exportFileName({ ...t, name: '东京 · 大阪 / 2025' })).toBe('东京-大阪-2025-TripSplit.xlsx');
    expect(exportFileName({ ...t, name: '***' })).toBe('trip-TripSplit.xlsx');
  });
});
