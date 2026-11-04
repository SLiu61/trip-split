import { computeExpense } from './split';
import type { Trip } from './types';

export interface MemberBalance {
  memberId: string;
  /** What this member paid for the group (base minor units). */
  paid: number;
  /** What this member consumed — their share of all expenses (base minor units). */
  share: number;
  /** paid - share. Positive = is owed money, negative = owes money. */
  net: number;
}

export interface Transfer {
  from: string;
  to: string;
  /** base minor units, > 0 */
  amount: number;
}

export function computeBalances(trip: Trip): MemberBalance[] {
  const order = trip.members.map((m) => m.id);
  const map = new Map<string, MemberBalance>(
    order.map((id) => [id, { memberId: id, paid: 0, share: 0, net: 0 }]),
  );
  for (const e of trip.expenses) {
    const { baseTotal, shares } = computeExpense(e, trip.baseCurrency, order);
    const payer = map.get(e.payerId);
    if (payer) payer.paid += baseTotal;
    for (const [id, s] of Object.entries(shares)) {
      const b = map.get(id);
      if (b) b.share += s;
    }
  }
  for (const b of map.values()) b.net = b.paid - b.share;
  return order.map((id) => map.get(id)!);
}

/** Members above this many non-zero balances fall back to the greedy heuristic. */
export const EXACT_LIMIT = 16;

/**
 * Compute a set of transfers that settles all balances.
 *
 * Finding the true minimum number of transfers is NP-hard in general, but trip
 * groups are small. The minimum equals (people with non-zero balance) minus
 * (the maximum number of disjoint sub-groups whose balances sum to zero), because
 * each zero-sum group of size k can be settled with exactly k-1 transfers.
 *
 * - Up to EXACT_LIMIT non-zero balances: bitmask DP finds that optimal partition.
 * - Above that: greedy (largest debtor pays largest creditor), which is at most n-1 transfers.
 *
 * Input order is used for all tie-breaks, so results are deterministic.
 */
export function settle(balances: { memberId: string; net: number }[]): Transfer[] {
  const people = balances.filter((b) => b.net !== 0).map((b) => ({ id: b.memberId, net: b.net }));
  const total = people.reduce((s, p) => s + p.net, 0);
  if (total !== 0) throw new Error(`settle: balances do not sum to zero (${total})`);
  if (people.length === 0) return [];
  if (people.length > EXACT_LIMIT) return greedy(people);

  const groups = zeroSumPartition(people.map((p) => p.net));
  return groups.flatMap((g) => greedy(g.map((i) => people[i])));
}

/** Greedy: repeatedly match the largest debtor with the largest creditor. */
export function greedy(people: { id: string; net: number }[]): Transfer[] {
  const creditors = people.filter((p) => p.net > 0).map((p) => ({ ...p }));
  const debtors = people.filter((p) => p.net < 0).map((p) => ({ id: p.id, net: -p.net }));
  const transfers: Transfer[] = [];
  const byAmountDesc = (a: { net: number }, b: { net: number }) => b.net - a.net;

  while (creditors.length && debtors.length) {
    // Stable sort keeps input order among equal amounts.
    creditors.sort(byAmountDesc);
    debtors.sort(byAmountDesc);
    const c = creditors[0];
    const d = debtors[0];
    const amount = Math.min(c.net, d.net);
    transfers.push({ from: d.id, to: c.id, amount });
    c.net -= amount;
    d.net -= amount;
    if (c.net === 0) creditors.shift();
    if (d.net === 0) debtors.shift();
  }
  return transfers;
}

/**
 * Partition indices of `nets` (which sum to zero, none zero) into the maximum
 * number of disjoint groups that each sum to zero.
 *
 * dp[mask] = max number of complete zero-sum groups we can peel off when the
 * people in `mask` are removed one at a time. Following the argmax chain from the
 * full mask down to 0, the masks with sum 0 are nested; the differences between
 * consecutive ones are the groups.
 */
export function zeroSumPartition(nets: number[]): number[][] {
  const n = nets.length;
  const full = (1 << n) - 1;
  const sum = new Float64Array(1 << n);
  const dp = new Int32Array(1 << n);
  for (let mask = 1; mask <= full; mask++) {
    const low = mask & -mask;
    const i = 31 - Math.clz32(low);
    sum[mask] = sum[mask ^ low] + nets[i];
    let best = 0;
    for (let j = 0; j < n; j++) {
      if (mask & (1 << j)) {
        const v = dp[mask ^ (1 << j)];
        if (v > best) best = v;
      }
    }
    dp[mask] = best + (sum[mask] === 0 ? 1 : 0);
  }

  // Walk the chain, recording zero-sum masks.
  const zeroMasks: number[] = [];
  let mask = full;
  while (mask) {
    if (sum[mask] === 0) zeroMasks.push(mask);
    const target = dp[mask] - (sum[mask] === 0 ? 1 : 0);
    let next = -1;
    for (let j = 0; j < n; j++) {
      if (mask & (1 << j) && dp[mask ^ (1 << j)] === target) {
        next = mask ^ (1 << j);
        break;
      }
    }
    mask = next;
  }
  zeroMasks.push(0);

  const groups: number[][] = [];
  for (let k = 0; k < zeroMasks.length - 1; k++) {
    const diff = zeroMasks[k] & ~zeroMasks[k + 1];
    const g: number[] = [];
    for (let j = 0; j < n; j++) if (diff & (1 << j)) g.push(j);
    if (g.length) groups.push(g);
  }
  // Present groups in input order of their first member.
  return groups.sort((a, b) => a[0] - b[0]);
}
