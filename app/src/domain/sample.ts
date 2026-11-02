import type { Category, Expense, Split, Trip } from './types';
import { roundRate } from './rates';

/**
 * A ready-made trip so anyone can try the app instantly.
 *
 * Rates are stored on each expense (like real ones) so the demo works offline and
 * always produces the same numbers. They are snapshots of approximate ECB reference
 * rates for June 2025; open an expense and press "Refetch" to pull the live value.
 */

const M = { mia: 'sample-mia', leo: 'sample-leo', wei: 'sample-wei', sofia: 'sample-sofia' };
const ALL = [M.mia, M.leo, M.wei, M.sofia];

// EUR per 1 unit, keyed by ECB date
const CZK: Record<string, number> = { '2025-06-06': 24.782, '2025-06-09': 24.756, '2025-06-10': 24.738 };
const CHF: Record<string, number> = { '2025-06-11': 0.9393, '2025-06-12': 0.9389, '2025-06-13': 0.9367 };

type Row = [
  date: string,
  description: string,
  amount: number,
  currency: 'EUR' | 'CZK' | 'CHF',
  payer: string,
  category: Category,
  split: Split,
  rate?: { ecbDate: string } | { manual: number },
];

const equal = (participants = ALL): Split => ({ mode: 'equal', participants });

const rows: Row[] = [
  ['2025-06-05', 'Railjet Munich → Vienna', 236.4, 'EUR', M.leo, 'transport', equal()],
  ['2025-06-05', 'Vienna apartment (3 nights)', 486, 'EUR', M.mia, 'lodging', equal()],
  ['2025-06-06', 'Schönbrunn Palace tickets', 116, 'EUR', M.wei, 'tickets', equal()],
  ['2025-06-06', 'Dinner at a Heuriger', 138.7, 'EUR', M.sofia, 'food', equal()],
  ['2025-06-07', 'Sachertorte & coffee', 47.3, 'EUR', M.leo, 'food', equal([M.mia, M.leo, M.wei])],
  ['2025-06-07', 'Train Vienna → Prague', 119.6, 'EUR', M.mia, 'transport', equal()],
  [
    '2025-06-08',
    'Prague Airbnb (3 nights)',
    10450,
    'CZK',
    M.wei,
    'lodging',
    { mode: 'shares', shares: { [M.mia]: 1, [M.leo]: 1, [M.wei]: 1.5, [M.sofia]: 1.5 } },
    { ecbDate: '2025-06-06' },
  ],
  ['2025-06-08', 'Svíčková & Pilsner dinner', 2380, 'CZK', M.leo, 'food', equal(), { ecbDate: '2025-06-06' }],
  ['2025-06-09', 'Prague Castle tickets', 1000, 'CZK', M.sofia, 'tickets', equal(), { ecbDate: '2025-06-09' }],
  ['2025-06-09', 'Taxi back from Vyšehrad', 389, 'CZK', M.mia, 'transport', equal([M.mia, M.sofia]), { ecbDate: '2025-06-09' }],
  [
    '2025-06-10',
    'Jazz club (entry + drinks)',
    1760,
    'CZK',
    M.leo,
    'tickets',
    { mode: 'amount', amounts: { [M.mia]: 440, [M.leo]: 440, [M.wei]: 880 } },
    { ecbDate: '2025-06-10' },
  ],
  ['2025-06-10', 'Flight Prague → Zurich', 312.8, 'EUR', M.wei, 'transport', equal()],
  ['2025-06-11', 'Zurich hotel (2 nights)', 760, 'CHF', M.sofia, 'lodging', equal(), { ecbDate: '2025-06-11' }],
  ['2025-06-12', 'SBB day trip to Lucerne', 263.2, 'CHF', M.mia, 'transport', equal(), { ecbDate: '2025-06-12' }],
  ['2025-06-12', 'Mt. Pilatus cogwheel railway', 312, 'CHF', M.leo, 'tickets', equal(), { ecbDate: '2025-06-12' }],
  ['2025-06-13', 'Fondue dinner', 247.5, 'CHF', M.wei, 'food', equal(), { ecbDate: '2025-06-13' }],
  [
    '2025-06-13',
    'Swiss chocolate to take home',
    86.4,
    'CHF',
    M.sofia,
    'other',
    { mode: 'amount', amounts: { [M.mia]: 21.6, [M.sofia]: 64.8 } },
    { ecbDate: '2025-06-13' },
  ],
  // Paid with cash bought at an airport kiosk — the real rate was worse than ECB's.
  ['2025-06-14', 'Airport snacks (kiosk cash rate)', 24.9, 'CHF', M.mia, 'food', equal([M.mia, M.leo]), { manual: 1.02 }],
];

export const SAMPLE_TRIP_ID = 'sample-europe-2025';

export function makeSampleTrip(): Trip {
  const expenses: Expense[] = rows.map(([date, description, amount, currency, payerId, category, split, rate], i) => {
    const base = {
      id: `sample-e${i + 1}`,
      description,
      amount,
      currency,
      date,
      payerId,
      category,
      split,
      createdAt: Date.UTC(2025, 5, 5) + i * 1000,
    };
    if (currency === 'EUR') return { ...base, rate: 1, rateSource: 'same' };
    if (rate && 'manual' in rate) return { ...base, rate: rate.manual, rateSource: 'manual' };
    const ecbDate = rate!.ecbDate;
    const perEur = currency === 'CZK' ? CZK[ecbDate] : CHF[ecbDate];
    return { ...base, rate: roundRate(1 / perEur), rateSource: 'api', rateDate: ecbDate };
  });

  return {
    id: SAMPLE_TRIP_ID,
    name: 'Vienna · Prague · Zurich 2025',
    baseCurrency: 'EUR',
    members: [
      { id: M.mia, name: 'Mia' },
      { id: M.leo, name: 'Leo' },
      { id: M.wei, name: 'Wei' },
      { id: M.sofia, name: 'Sofia' },
    ],
    expenses,
    createdAt: Date.UTC(2025, 5, 1),
    isSample: true,
  };
}
