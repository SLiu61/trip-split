export type Category = 'food' | 'transport' | 'lodging' | 'tickets' | 'other';
export const CATEGORIES: Category[] = ['food', 'transport', 'lodging', 'tickets', 'other'];

export interface Member {
  id: string;
  name: string;
}

/**
 * How an expense is divided among members.
 * - equal:  split evenly among `participants`
 * - amount: explicit amounts in the expense's original currency (must add up to the total)
 * - shares: weights, e.g. 2 shares for someone who had two nights at the hotel
 */
export type Split =
  | { mode: 'equal'; participants: string[] }
  | { mode: 'amount'; amounts: Record<string, number> }
  | { mode: 'shares'; shares: Record<string, number> };

export type SplitMode = Split['mode'];

/** Where the exchange rate stored on an expense came from. */
export type RateSource = 'same' | 'api' | 'manual';

export interface Expense {
  id: string;
  description: string;
  /** Amount in major units of `currency` (e.g. 12.5 = CHF 12.50). Always > 0. */
  amount: number;
  currency: string;
  /** ISO date YYYY-MM-DD */
  date: string;
  payerId: string;
  category: Category;
  split: Split;
  /** 1 unit of `currency` = `rate` units of the trip base currency. Stored so results are reproducible. */
  rate: number;
  rateSource: RateSource;
  /** Reference date the API actually returned (ECB publishes on business days only). */
  rateDate?: string;
  createdAt: number;
}

export interface Trip {
  id: string;
  name: string;
  baseCurrency: string;
  members: Member[];
  expenses: Expense[];
  createdAt: number;
  isSample?: boolean;
}
