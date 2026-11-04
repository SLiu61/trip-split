import { useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import type { Trip } from '../domain/types';
import { CURRENCIES } from '../domain/money';
import { newId } from '../store';

interface Props {
  trip: Trip;
  updateTrip: (fn: (t: Trip) => Trip) => void;
  onDelete: () => void;
  onResetSample: () => void;
}

export function SettingsView({ trip, updateTrip, onDelete, onResetSample }: Props) {
  const { t } = useI18n();
  const [newMember, setNewMember] = useState('');
  const [error, setError] = useState<string | null>(null);
  const used = new Set(
    trip.expenses.flatMap((e) => [
      e.payerId,
      ...(e.split.mode === 'equal'
        ? e.split.participants
        : Object.keys(e.split.mode === 'amount' ? e.split.amounts : e.split.shares)),
    ]),
  );
  const isDup = (name: string, exceptId?: string) =>
    trip.members.some((m) => m.id !== exceptId && m.name.trim().toLowerCase() === name.trim().toLowerCase());

  const addMember = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newMember.trim();
    if (!name) return;
    if (isDup(name)) return setError(t('duplicateMember'));
    setError(null);
    updateTrip((tr) => ({ ...tr, members: [...tr.members, { id: newId('m'), name }] }));
    setNewMember('');
  };

  return (
    <div className="stack">
      <section className="card form">
        <h2>{t('settingsTrip')}</h2>
        <label className="field">
          <span>{t('tripName')}</span>
          <input value={trip.name} onChange={(e) => updateTrip((tr) => ({ ...tr, name: e.target.value }))} />
        </label>
        <label className="field">
          <span>{t('baseCurrency')}</span>
          <select
            value={trip.baseCurrency}
            disabled={trip.expenses.length > 0}
            onChange={(e) => updateTrip((tr) => ({ ...tr, baseCurrency: e.target.value }))}
          >
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          {trip.expenses.length > 0 && <small className="muted">{t('baseLocked')}</small>}
        </label>
      </section>

      <section className="card form">
        <h2>{t('members')}</h2>
        <ul className="member-edit">
          {trip.members.map((m) => (
            <li key={m.id} className="row">
              <input
                value={m.name}
                aria-label={t('rename')}
                onChange={(e) =>
                  updateTrip((tr) => ({
                    ...tr,
                    members: tr.members.map((x) => (x.id === m.id ? { ...x, name: e.target.value } : x)),
                  }))
                }
              />
              {used.has(m.id) ? (
                <span className="muted small nowrap">{t('memberInUse')}</span>
              ) : (
                <button
                  className="btn ghost danger sm"
                  disabled={trip.members.length <= 2}
                  onClick={() => updateTrip((tr) => ({ ...tr, members: tr.members.filter((x) => x.id !== m.id) }))}
                >
                  {t('remove')}
                </button>
              )}
            </li>
          ))}
        </ul>
        <form onSubmit={addMember} className="row">
          <input value={newMember} onChange={(e) => setNewMember(e.target.value)} placeholder={t('memberPlaceholder')} />
          <button className="btn" type="submit">
            + {t('addMember')}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="card danger-zone">
        {trip.isSample && (
          <button className="btn" onClick={onResetSample}>
            ↺ {t('resetSample')}
          </button>
        )}
        <button className="btn danger" onClick={() => window.confirm(t('confirmDeleteTrip', { name: trip.name })) && onDelete()}>
          {t('deleteTrip')}
        </button>
      </section>
    </div>
  );
}
