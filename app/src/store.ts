import { useCallback, useEffect, useState } from 'react';
import type { Trip } from './domain/types';
import { makeSampleTrip, SAMPLE_TRIP_ID } from './domain/sample';

const KEY = 'tripsplit.trips.v1';

interface Persisted {
  version: 1;
  trips: Trip[];
}

function load(): Trip[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as Persisted;
    return Array.isArray(data.trips) ? data.trips : [];
  } catch {
    return [];
  }
}

function save(trips: Trip[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: 1, trips } satisfies Persisted));
  } catch {
    /* quota exceeded / private mode: keep working in memory */
  }
}

export function newId(prefix = ''): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}${Date.now().toString(36)}${rand}`;
}

export function useTrips() {
  const [trips, setTrips] = useState<Trip[]>(load);

  useEffect(() => save(trips), [trips]);

  // Keep tabs in sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setTrips(load());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const upsertTrip = useCallback((trip: Trip) => {
    setTrips((ts) => {
      const i = ts.findIndex((t) => t.id === trip.id);
      if (i === -1) return [trip, ...ts];
      const copy = ts.slice();
      copy[i] = trip;
      return copy;
    });
  }, []);

  const updateTrip = useCallback((id: string, fn: (t: Trip) => Trip) => {
    setTrips((ts) => ts.map((t) => (t.id === id ? fn(t) : t)));
  }, []);

  const deleteTrip = useCallback((id: string) => {
    setTrips((ts) => ts.filter((t) => t.id !== id));
  }, []);

  /** Load (or reset) the sample trip and return its id. */
  const loadSample = useCallback(() => {
    upsertTrip(makeSampleTrip());
    return SAMPLE_TRIP_ID;
  }, [upsertTrip]);

  return { trips, upsertTrip, updateTrip, deleteTrip, loadSample };
}

/** Tiny hash router: #/ or #/trip/<id>/<tab> */
export type Tab = 'expenses' | 'settle' | 'summary' | 'settings';
export interface Route {
  tripId?: string;
  tab: Tab;
}

function parseHash(): Route {
  const parts = window.location.hash.replace(/^#\/?/, '').split('/');
  if (parts[0] === 'trip' && parts[1]) {
    const tab = (['expenses', 'settle', 'summary', 'settings'] as Tab[]).includes(parts[2] as Tab)
      ? (parts[2] as Tab)
      : 'expenses';
    return { tripId: decodeURIComponent(parts[1]), tab };
  }
  return { tab: 'expenses' };
}

export function useRoute(): [Route, (r: Route) => void] {
  const [route, setRoute] = useState<Route>(parseHash);
  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const navigate = useCallback((r: Route) => {
    window.location.hash = r.tripId ? `/trip/${encodeURIComponent(r.tripId)}/${r.tab}` : '/';
    window.scrollTo(0, 0);
  }, []);
  return [route, navigate];
}
