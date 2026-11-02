import { computeBalances, settle, type MemberBalance, type Transfer } from './settle';
import { computeExpense, type ExpenseBreakdown } from './split';
import { toMinor } from './money';
import { CATEGORIES, type Category, type Expense, type Trip } from './types';

export interface CurrencyTotal {
  currency: string;
  /** minor units of that currency */
  originalTotal: number;
  /** base minor units */
  baseTotal: number;
  count: number;
}

export interface TripReport {
  expenses: (Expense & ExpenseBreakdown)[];
  balances: MemberBalance[];
  transfers: Transfer[];
  total: number;
  byCategory: { category: Category; total: number; count: number }[];
  byCurrency: CurrencyTotal[];
  /** Reconciliation checks — these should always hold; shown to the user as a trust signal. */
  checks: {
    sharesEqualTotal: boolean;
    balancesSumToZero: boolean;
    transfersSettleAll: boolean;
  };
}

/** Everything the UI and the Excel export need, computed in one place. */
export function buildReport(trip: Trip): TripReport {
  const order = trip.members.map((m) => m.id);
  const expenses = [...trip.expenses]
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
    .map((e) => ({ ...e, ...computeExpense(e, trip.baseCurrency, order) }));

  const balances = computeBalances(trip);
  const transfers = settle(balances);
  const total = expenses.reduce((s, e) => s + e.baseTotal, 0);

  const byCategory = CATEGORIES.map((category) => {
    const items = expenses.filter((e) => e.category === category);
    return { category, total: items.reduce((s, e) => s + e.baseTotal, 0), count: items.length };
  });

  const cur = new Map<string, CurrencyTotal>();
  for (const e of expenses) {
    const c = cur.get(e.currency) ?? { currency: e.currency, originalTotal: 0, baseTotal: 0, count: 0 };
    c.originalTotal += toMinor(e.amount, e.currency);
    c.baseTotal += e.baseTotal;
    c.count += 1;
    cur.set(e.currency, c);
  }

  // Reconciliation
  const shareSum = expenses.reduce((s, e) => s + Object.values(e.shares).reduce((a, b) => a + b, 0), 0);
  const after = new Map(balances.map((b) => [b.memberId, b.net]));
  for (const t of transfers) {
    after.set(t.from, (after.get(t.from) ?? 0) + t.amount);
    after.set(t.to, (after.get(t.to) ?? 0) - t.amount);
  }

  return {
    expenses,
    balances,
    transfers,
    total,
    byCategory,
    byCurrency: [...cur.values()].sort((a, b) => b.baseTotal - a.baseTotal),
    checks: {
      sharesEqualTotal: shareSum === total,
      balancesSumToZero: balances.reduce((s, b) => s + b.net, 0) === 0,
      transfersSettleAll: [...after.values()].every((v) => v === 0),
    },
  };
}
