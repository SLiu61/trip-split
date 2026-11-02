import { describe, expect, it } from 'vitest';
import { computeBalances, EXACT_LIMIT, greedy, settle, zeroSumPartition } from './settle';
import type { Expense, Trip } from './types';

const bal = (nets: Record<string, number>) => Object.entries(nets).map(([memberId, net]) => ({ memberId, net }));

/** Apply transfers and return the remaining balances — must all be zero. */
function remaining(nets: Record<string, number>, transfers: { from: string; to: string; amount: number }[]) {
  const left = { ...nets };
  for (const t of transfers) {
    expect(t.amount).toBeGreaterThan(0);
    expect(t.from).not.toBe(t.to);
    left[t.from] += t.amount;
    left[t.to] -= t.amount;
  }
  return left;
}

/** Brute force: minimum transfers = n - max zero-sum groups, computed by trying all partitions. */
function bruteMin(nets: number[]): number {
  const n = nets.length;
  let best = 0;
  const rec = (rest: number[], groups: number) => {
    if (rest.length === 0) {
      best = Math.max(best, groups);
      return;
    }
    const [first, ...others] = rest;
    // choose subset of others to join `first`
    const m = others.length;
    for (let mask = 0; mask < 1 << m; mask++) {
      let s = nets[first];
      const inG: number[] = [];
      const outG: number[] = [];
      for (let j = 0; j < m; j++) (mask & (1 << j) ? inG : outG).push(others[j]);
      for (const j of inG) s += nets[j];
      if (s === 0) rec(outG, groups + 1);
    }
  };
  rec(nets.map((_, i) => i), 0);
  return n - best;
}

describe('settle', () => {
  it('returns nothing when everyone is even', () => {
    expect(settle(bal({ a: 0, b: 0 }))).toEqual([]);
    expect(settle([])).toEqual([]);
  });

  it('settles a simple two-person debt', () => {
    expect(settle(bal({ a: 500, b: -500 }))).toEqual([{ from: 'b', to: 'a', amount: 500 }]);
  });

  it('one payer, three debtors -> three transfers', () => {
    const nets = { a: 900, b: -300, c: -300, d: -300 };
    const t = settle(bal(nets));
    expect(t).toHaveLength(3);
    expect(Object.values(remaining(nets, t)).every((v) => v === 0)).toBe(true);
  });

  it('matches brute force on a mixed six-person group', () => {
    const nets = { a: 6, b: 5, c: -4, d: -7, e: 3, f: -3 };
    const t = settle(bal(nets));
    expect(t.length).toBe(bruteMin(Object.values(nets)));
    expect(Object.values(remaining(nets, t)).every((v) => v === 0)).toBe(true);
  });

  it('uses fewer transfers than greedy on a known counterexample', () => {
    // Groups {+5,-5} and {+4,+3,-7}: optimal 1 + 2 = 3 transfers.
    // Greedy: -7 -> +5 (rest -2), -5 -> +4 (rest -1), ... = 4 transfers.
    const nets = { a: 5, b: 4, c: 3, d: -7, e: -5 };
    const people = bal(nets).map((b) => ({ id: b.memberId, net: b.net }));
    expect(greedy(people)).toHaveLength(4);
    const t = settle(bal(nets));
    expect(t).toHaveLength(3);
    expect(t).toContainEqual({ from: 'e', to: 'a', amount: 5 });
    expect(Object.values(remaining(nets, t)).every((v) => v === 0)).toBe(true);
  });

  it('is optimal and always settles (property test vs brute force)', () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    for (let i = 0; i < 300; i++) {
      const n = 2 + Math.floor(rnd() * 7);
      // small values => many accidental zero-sum subgroups, the interesting case
      const vals = Array.from({ length: n - 1 }, () => Math.floor(rnd() * 21) - 10);
      vals.push(-vals.reduce((a, b) => a + b, 0));
      const nets: Record<string, number> = {};
      vals.forEach((v, j) => (nets[`m${j}`] = v));
      const t = settle(bal(nets));
      expect(Object.values(remaining(nets, t)).every((v) => v === 0)).toBe(true);
      expect(t.length).toBe(bruteMin(vals.filter((v) => v !== 0)));
    }
  });

  it('is deterministic', () => {
    const nets = bal({ a: 1000, b: 1000, c: -1000, d: -1000 });
    expect(settle(nets)).toEqual(settle(nets));
    expect(settle(nets)).toEqual([
      { from: 'c', to: 'a', amount: 1000 },
      { from: 'd', to: 'b', amount: 1000 },
    ]);
  });

  it('falls back to greedy for large groups and still settles', () => {
    const nets: Record<string, number> = {};
    for (let i = 0; i < EXACT_LIMIT + 4; i++) nets[`m${i}`] = i % 2 ? 100 + i : -(100 + i - 1);
    const s = Object.values(nets).reduce((a, b) => a + b, 0);
    nets.m0 -= s;
    const t = settle(bal(nets));
    expect(t.length).toBeLessThan(Object.keys(nets).length);
    expect(Object.values(remaining(nets, t)).every((v) => v === 0)).toBe(true);
  });

  it('refuses balances that do not sum to zero', () => {
    expect(() => settle(bal({ a: 1, b: 0 }))).toThrow();
  });
});

describe('zeroSumPartition', () => {
  it('finds the maximum number of zero-sum groups', () => {
    const groups = zeroSumPartition([5, 4, 3, -7, -5]);
    expect(groups).toHaveLength(2);
    groups.forEach((g) => expect(g.reduce((s, i) => s + [5, 4, 3, -7, -5][i], 0)).toBe(0));
  });
});

describe('computeBalances', () => {
  const base: Omit<Expense, 'id' | 'amount' | 'payerId' | 'split'> = {
    description: 'x',
    currency: 'EUR',
    date: '2025-06-01',
    category: 'food',
    rate: 1,
    rateSource: 'same',
    createdAt: 0,
  };
  const trip: Trip = {
    id: 't',
    name: 'T',
    baseCurrency: 'EUR',
    createdAt: 0,
    members: [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
      { id: 'c', name: 'C' },
    ],
    expenses: [
      { ...base, id: '1', amount: 10, payerId: 'a', split: { mode: 'equal', participants: ['a', 'b', 'c'] } },
      { ...base, id: '2', amount: 20, payerId: 'b', split: { mode: 'equal', participants: ['a', 'b', 'c'] } },
      { ...base, id: '3', amount: 100, currency: 'CHF', rate: 1.0646, payerId: 'c', split: { mode: 'equal', participants: ['a', 'b'] } },
    ],
  };

  it('computes paid, share and net in base minor units', () => {
    const b = computeBalances(trip);
    // e1: 3.34/3.33/3.33, e2: 6.67/6.67/6.66, e3: 106.46 -> 53.23/53.23
    expect(b).toEqual([
      { memberId: 'a', paid: 1000, share: 334 + 667 + 5323, net: 1000 - 6324 },
      { memberId: 'b', paid: 2000, share: 333 + 667 + 5323, net: 2000 - 6323 },
      { memberId: 'c', paid: 10646, share: 333 + 666, net: 10646 - 999 },
    ]);
  });

  it('balances always sum to exactly zero', () => {
    expect(computeBalances(trip).reduce((s, x) => s + x.net, 0)).toBe(0);
  });
});
