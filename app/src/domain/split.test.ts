import { describe, expect, it } from 'vitest';
import { allocate, computeExpense, splitWeights, validateExpense } from './split';
import type { Expense, Split } from './types';

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const ORDER = ['a', 'b', 'c', 'd'];

function exp(partial: Partial<Expense> & { split: Split }): Expense {
  return {
    id: 'x',
    description: 'test',
    amount: 10,
    currency: 'EUR',
    date: '2025-06-01',
    payerId: 'a',
    category: 'food',
    rate: 1,
    rateSource: 'same',
    createdAt: 0,
    ...partial,
  };
}

describe('allocate (largest remainder)', () => {
  it('splits evenly when divisible', () => {
    expect(allocate(1200, [1, 1, 1, 1])).toEqual([300, 300, 300, 300]);
  });

  it('gives the leftover cent to the earliest member on ties: €10 / 3', () => {
    expect(allocate(1000, [1, 1, 1])).toEqual([334, 333, 333]);
  });

  it('distributes two leftover cents: €0.05 / 3', () => {
    expect(allocate(5, [1, 1, 1])).toEqual([2, 2, 1]);
  });

  it('handles totals smaller than the number of people: €0.01 / 4', () => {
    expect(allocate(1, [1, 1, 1, 1])).toEqual([1, 0, 0, 0]);
  });

  it('gives leftovers to the largest fractional remainder, not the first person', () => {
    // 100 by 1:2 -> 33.33 / 66.67 -> [33, 67]
    expect(allocate(100, [1, 2])).toEqual([33, 67]);
    // 10 by 1:1:3 -> 2 / 2 / 6 exactly
    expect(allocate(10, [1, 1, 3])).toEqual([2, 2, 6]);
    // 7 by 3:3:1 -> 3 / 3 / 1
    expect(allocate(7, [3, 3, 1])).toEqual([3, 3, 1]);
    // 11 by 1:1:1:2 -> 2.2, 2.2, 2.2, 4.4 -> the 4.4 has the largest remainder
    expect(allocate(11, [1, 1, 1, 2])).toEqual([2, 2, 2, 5]);
  });

  it('never assigns to zero-weight entries', () => {
    expect(allocate(101, [0, 1, 1])).toEqual([0, 51, 50]);
  });

  it('supports negative totals symmetrically', () => {
    expect(allocate(-1000, [1, 1, 1])).toEqual([-334, -333, -333]);
  });

  it('is exact for huge numbers (no float overflow)', () => {
    const total = 9_007_199_254_740; // ~ 90 billion EUR in cents
    const parts = allocate(total, [123_456_789, 987_654_321, 555]);
    expect(sum(parts)).toBe(total);
  });

  it('always sums to the total (property test)', () => {
    let seed = 42;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    for (let i = 0; i < 2000; i++) {
      const n = 1 + Math.floor(rnd() * 8);
      const weights = Array.from({ length: n }, () => Math.floor(rnd() * 5000));
      if (sum(weights) === 0) weights[0] = 1;
      const total = Math.floor(rnd() * 1_000_000);
      const parts = allocate(total, weights);
      expect(sum(parts)).toBe(total);
      parts.forEach((p, j) => {
        const exact = (total * weights[j]) / sum(weights);
        expect(Math.abs(p - exact)).toBeLessThan(1); // each part within 1 cent of exact
      });
    }
  });

  it('rejects invalid input', () => {
    expect(() => allocate(10, [])).toThrow();
    expect(() => allocate(10, [0, 0])).toThrow();
    expect(() => allocate(10.5, [1])).toThrow();
    expect(() => allocate(10, [1.5])).toThrow();
  });
});

describe('splitWeights', () => {
  it('follows member order, not insertion order', () => {
    const w = splitWeights({ mode: 'equal', participants: ['c', 'a'] }, 'EUR', ORDER);
    expect(w.map((x) => x.memberId)).toEqual(['a', 'c']);
  });

  it('ignores members that no longer exist', () => {
    const w = splitWeights({ mode: 'equal', participants: ['a', 'ghost'] }, 'EUR', ORDER);
    expect(w).toEqual([{ memberId: 'a', weight: 1 }]);
  });

  it('scales decimal shares to integers', () => {
    const w = splitWeights({ mode: 'shares', shares: { a: 1, b: 1.5, c: 0 } }, 'EUR', ORDER);
    expect(w).toEqual([
      { memberId: 'a', weight: 1000 },
      { memberId: 'b', weight: 1500 },
    ]);
  });
});

describe('validateExpense', () => {
  it('accepts a valid equal split', () => {
    expect(validateExpense(exp({ split: { mode: 'equal', participants: ['a', 'b'] } }), ORDER).ok).toBe(true);
  });

  it('requires participants', () => {
    expect(validateExpense(exp({ split: { mode: 'equal', participants: [] } }), ORDER).error).toBe('noParticipants');
    expect(validateExpense(exp({ split: { mode: 'shares', shares: { a: 0 } } }), ORDER).error).toBe('noParticipants');
  });

  it('requires custom amounts to add up exactly, and reports what is left', () => {
    const v = validateExpense(exp({ amount: 10, split: { mode: 'amount', amounts: { a: 3.33, b: 3.33, c: 3.33 } } }), ORDER);
    expect(v.error).toBe('amountMismatch');
    expect(v.remainderMinor).toBe(1);
    const ok = validateExpense(exp({ amount: 10, split: { mode: 'amount', amounts: { a: 3.34, b: 3.33, c: 3.33 } } }), ORDER);
    expect(ok.ok).toBe(true);
  });

  it('treats float noise in custom amounts as exact (0.1 + 0.2)', () => {
    const v = validateExpense(exp({ amount: 0.3, split: { mode: 'amount', amounts: { a: 0.1, b: 0.2 } } }), ORDER);
    expect(v.ok).toBe(true);
  });

  it('rejects bad amounts, rates and negative values', () => {
    const split: Split = { mode: 'equal', participants: ['a'] };
    expect(validateExpense(exp({ amount: 0, split }), ORDER).error).toBe('invalidAmount');
    expect(validateExpense(exp({ amount: NaN, split }), ORDER).error).toBe('invalidAmount');
    expect(validateExpense(exp({ rate: 0, split }), ORDER).error).toBe('invalidRate');
    expect(validateExpense(exp({ split: { mode: 'shares', shares: { a: 2, b: -1 } } }), ORDER).error).toBe('negativeValue');
  });
});

describe('computeExpense', () => {
  it('splits a base-currency expense equally', () => {
    const r = computeExpense(exp({ amount: 10, split: { mode: 'equal', participants: ['a', 'b', 'c'] } }), 'EUR', ORDER);
    expect(r.baseTotal).toBe(1000);
    expect(r.shares).toEqual({ a: 334, b: 333, c: 333 });
  });

  it('converts first, then splits — shares sum to the converted total', () => {
    // 100 CHF @ 1.0646 = 106.46 EUR; / 3 = 35.49, 35.49, 35.48
    const r = computeExpense(
      exp({ amount: 100, currency: 'CHF', rate: 1.0646, rateSource: 'api', split: { mode: 'equal', participants: ['a', 'b', 'c'] } }),
      'EUR',
      ORDER,
    );
    expect(r.baseTotal).toBe(10646);
    expect(r.shares).toEqual({ a: 3549, b: 3549, c: 3548 });
  });

  it('splits custom amounts proportionally in base currency', () => {
    // 1760 CZK: 440 / 440 / 880 @ 0.040424 -> 71.15 EUR total
    const r = computeExpense(
      exp({ amount: 1760, currency: 'CZK', rate: 0.040424, split: { mode: 'amount', amounts: { a: 440, b: 440, c: 880 } } }),
      'EUR',
      ORDER,
    );
    expect(r.baseTotal).toBe(7115);
    expect(r.shares.a + r.shares.b + r.shares.c).toBe(7115);
    expect(r.shares).toEqual({ a: 1779, b: 1779, c: 3557 });
  });

  it('splits by shares', () => {
    const r = computeExpense(exp({ amount: 100, split: { mode: 'shares', shares: { a: 1, b: 1, c: 1.5, d: 1.5 } } }), 'EUR', ORDER);
    expect(r.shares).toEqual({ a: 2000, b: 2000, c: 3000, d: 3000 });
  });

  it('handles a tiny foreign expense that rounds to zero', () => {
    const r = computeExpense(exp({ amount: 0.1, currency: 'CZK', rate: 0.04, split: { mode: 'equal', participants: ['a', 'b'] } }), 'EUR', ORDER);
    expect(r.baseTotal).toBe(0);
    expect(r.shares).toEqual({ a: 0, b: 0 });
  });

  it('ignores the stored rate when the currency equals the base', () => {
    const r = computeExpense(exp({ amount: 10, rate: 999, split: { mode: 'equal', participants: ['a'] } }), 'EUR', ORDER);
    expect(r.baseTotal).toBe(1000);
  });
});
