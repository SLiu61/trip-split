import { useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import type { Trip } from '../domain/types';
import { buildReport } from '../domain/summary';
import { formatMoney } from '../domain/money';
import { NewTripForm } from './NewTripForm';

interface Props {
  trips: Trip[];
  onOpen: (id: string) => void;
  onCreate: (trip: Trip) => void;
  onSample: () => void;
}

export function Home({ trips, onOpen, onCreate, onSample }: Props) {
  const { t, locale } = useI18n();
  const [creating, setCreating] = useState(false);

  return (
    <div className="home">
      <section className="hero">
        <h1>{t('heroTitle')}</h1>
        <p>{t('heroBody')}</p>
        <div className="hero-actions">
          <button className="btn primary lg" onClick={onSample}>
            ✈️ {t('trySample')}
          </button>
          <button className="btn lg" onClick={() => setCreating(true)}>
            + {t('newTrip')}
          </button>
        </div>
        <p className="muted small">{t('sampleHint')}</p>
      </section>

      {creating && (
        <section className="card">
          <h2>{t('newTrip')}</h2>
          <NewTripForm onCancel={() => setCreating(false)} onCreate={onCreate} />
        </section>
      )}

      <section>
        <h2 className="section-title">{t('yourTrips')}</h2>
        {trips.length === 0 ? (
          <p className="muted">{t('noTrips')}</p>
        ) : (
          <ul className="trip-list">
            {trips.map((trip) => {
              const total = safeTotal(trip);
              return (
                <li key={trip.id}>
                  <button className="trip-item" onClick={() => onOpen(trip.id)}>
                    <div>
                      <div className="trip-name">
                        {trip.name} {trip.isSample && <span className="badge">{t('sample')}</span>}
                      </div>
                      <div className="muted small">
                        {t('membersCount', { n: trip.members.length })} · {t('expensesCount', { n: trip.expenses.length })}
                      </div>
                    </div>
                    <div className="trip-total">{formatMoney(total, trip.baseCurrency, locale)}</div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function safeTotal(trip: Trip): number {
  try {
    return buildReport(trip).total;
  } catch {
    return 0;
  }
}
