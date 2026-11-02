import { convertMinor, toMinor } from './money';
import type { Expense, Split } from './types';

/**
 * Split an integer `total` into integer parts proportional to `weights`, such that
 * the parts always add up to exactly `total` (largest remainder / Hamilton method).
 *
 * Leftover units go to the parts with the largest fractional remainder; ties are
 * broken by position, so the result is deterministic (earlier members absorb the
 * extra cent first). Example: 1000 split 3 ways -> [334, 333, 333].
 *
 * Uses BigInt internally so `total * weight` cannot overflow.
 */
export function allocate(total: number, weights: number[]): number[] {
  if (!Number.isInteger(total)) throw new Error('allocate: total must be an integer');
  if (weights.length === 0) throw new Error('allocate: no weights');
  if (weights.some((w) => !Number.isInteger(w) || w < 0)) {
    throw new Error('allocate: weights must be non-negative integers');
  }
  const sumW = weights.reduce((a, b) => a + b, 0);
  if (sumW === 0) throw new Error('allocate: weights sum to zero');

  const sign = total < 0 ? -1n : 1n;
  const T = BigInt(Math.abs(total));
  const W = BigInt(sumW);

  const floors: bigint[] = [];
  const remainders: bigint[] = [];
  weights.forEach((w) => {
    const num = T * BigInt(w);
    floors.push(num / W);
    remainders.push(num % W);
  });

  let leftover = T - floors.reduce((a, b) => a + b, 0n);
  const order = weights
    .map((_, i) => i)
    .filter((i) => weights[i] > 0)
    .sort((a, b) => (remainders[b] > remainders[a] ? 1 : remainders[b] < remainders[a] ? -1 : a - b));

  const parts = floors.slice();
  for (const i of order) {
    if (leftover === 0n) break;
    parts[i] += 1n;
    leftover -= 1n;
  }
  return parts.map((p) => Number(p * sign));
}

/** Shares are user-entered decimals (e.g. 1.5); scale to integers for exact allocation. */
const SHARE_SCALE = 1000;

export interface SplitEntry {
  memberId: string;
  /** Integer weight used for allocation. */
  weight: number;
}

/** Normalise any split mode into (memberId, integer weight) pairs, in member order. */
export function splitWeights(split: Split, currency: string, memberOrder: string[]): SplitEntry[] {
  const ordered = (ids: string[]) => memberOrder.filter((id) => ids.includes(id));
  switch (split.mode) {
    case 'equal':
      return ordered(split.participants).map((memberId) => ({ memberId, weight: 1 }));
    case 'amount':
      return ordered(Object.keys(split.amounts))
        .map((memberId) => ({ memberId, weight: toMinor(split.amounts[memberId] || 0, currency) }))
        .filter((e) => e.weight > 0);
    case 'shares':
      return ordered(Object.keys(split.shares))
        .map((memberId) => ({
          memberId,
          weight: Math.round((split.shares[memberId] || 0) * SHARE_SCALE),
        }))
        .filter((e) => e.weight > 0);
  }
}

export type SplitError =
  | 'noParticipants'
  | 'amountMismatch'
  | 'invalidAmount'
  | 'invalidRate'
  | 'negativeValue';

export interface SplitValidation {
  ok: boolean;
  error?: SplitError;
  /** For 'amount' mode: how much of the total is still unassigned (minor units of expense currency). */
  remainderMinor?: number;
}

export function validateExpense(
  e: Pick<Expense, 'amount' | 'currency' | 'split' | 'rate'>,
  memberOrder: string[],
): SplitValidation {
  if (!(e.amount > 0) || !Number.isFinite(e.amount)) return { ok: false, error: 'invalidAmount' };
  if (!(e.rate > 0) || !Number.isFinite(e.rate)) return { ok: false, error: 'invalidRate' };
  const raw =
    e.split.mode === 'amount'
      ? Object.values(e.split.amounts)
      : e.split.mode === 'shares'
        ? Object.values(e.split.shares)
        : [];
  if (raw.some((v) => v < 0)) return { ok: false, error: 'negativeValue' };

  const entries = splitWeights(e.split, e.currency, memberOrder);
  if (entries.length === 0) return { ok: false, error: 'noParticipants' };

  if (e.split.mode === 'amount') {
    const assigned = entries.reduce((s, x) => s + x.weight, 0);
    const remainderMinor = toMinor(e.amount, e.currency) - assigned;
    if (remainderMinor !== 0) return { ok: false, error: 'amountMismatch', remainderMinor };
  }
  return { ok: true };
}

export interface ExpenseBreakdown {
  /** Total in base-currency minor units. */
  baseTotal: number;
  /** memberId -> share in base-currency minor units. Sums exactly to baseTotal. */
  shares: Record<string, number>;
}

/**
 * Convert an expense to the base currency and split it.
 *
 * The total is converted (and rounded) once, then allocated. This guarantees the
 * shares add up to the converted total exactly — no cent is created or lost — which
 * is what makes the balances sum to zero.
 */
export function computeExpense(e: Expense, baseCurrency: string, memberOrder: string[]): ExpenseBreakdown {
  const totalMinor = toMinor(e.amount, e.currency);
  const baseTotal =
    e.currency === baseCurrency ? totalMinor : convertMinor(totalMinor, e.currency, e.rate, baseCurrency);
  const entries = splitWeights(e.split, e.currency, memberOrder);
  const shares: Record<string, number> = {};
  if (entries.length === 0) return { baseTotal, shares };
  const parts = allocate(
    baseTotal,
    entries.map((x) => x.weight),
  );
  entries.forEach((x, i) => {
    shares[x.memberId] = parts[i];
  });
  return { baseTotal, shares };
}
