import { useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import type { Category, Expense, Trip } from '../domain/types';
import type { TripReport } from '../domain/summary';
import { formatMoney, toMinor } from '../domain/money';
import { ExpenseForm } from './ExpenseForm';

export const CATEGORY_ICON: Record<Category, string> = {
  food: '🍽️',
  transport: '🚆',
  lodging: '🏨',
  tickets: '🎟️',
  other: '🛍️',
};

interface Props {
  trip: Trip;
  report: TripReport;
  updateTrip: (fn: (t: Trip) => Trip) => void;
}

export function ExpenseList({ trip, report, updateTrip }: Props) {
  const { t, locale } = useI18n();
  const [editing, setEditing] = useState<Expense | 'new' | null>(null);
  const name = (id: string) => trip.members.find((m) => m.id === id)?.name ?? '?';

  // Newest day first; within a day keep entry order.
  const byDate = new Map<string, TripReport['expenses']>();
  for (const e of [...report.expenses].reverse()) {
    byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]);
  }
  const fmtDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  const save = (e: Expense) => {
    updateTrip((tr) => {
      const exists = tr.expenses.some((x) => x.id === e.id);
      return { ...tr, expenses: exists ? tr.expenses.map((x) => (x.id === e.id ? e : x)) : [...tr.expenses, e] };
    });
    setEditing(null);
  };
  const remove = (id: string) => {
    updateTrip((tr) => ({ ...tr, expenses: tr.expenses.filter((x) => x.id !== id) }));
    setEditing(null);
  };

  return (
    <div>
      <div className="list-head">
        <span className="muted">{t('expensesCount', { n: trip.expenses.length })}</span>
        <button className="btn primary" onClick={() => setEditing('new')}>
          + {t('addExpense')}
        </button>
      </div>

      {trip.expenses.length === 0 && <p className="empty">{t('noExpenses')}</p>}

      {[...byDate.entries()].map(([date, items]) => (
        <section key={date} className="day">
          <h3 className="day-title">{fmtDate(date)}</h3>
          <ul className="expense-list">
            {items.map((e) => {
              const ids = Object.keys(e.shares);
              const forWho = ids.length === trip.members.length ? t('everyone') : ids.map(name).join(', ');
              return (
                <li key={e.id}>
                  <button className="expense" onClick={() => setEditing(e)}>
                    <span className="cat-icon" title={t(`cat_${e.category}`)}>
                      {CATEGORY_ICON[e.category]}
                    </span>
                    <span className="expense-main">
                      <span className="expense-desc">{e.description}</span>
                      <span className="muted small">
                        {name(e.payerId)} {t('paidFor')} · {t('forMembers', { names: forWho })}
                      </span>
                    </span>
                    <span className="expense-amt">
                      <strong>{formatMoney(e.baseTotal, trip.baseCurrency, locale)}</strong>
                      {e.currency !== trip.baseCurrency && (
                        <span className="muted small">
                          {formatMoney(toMinor(e.amount, e.currency), e.currency, locale)}
                          {e.rateSource === 'manual' && ' ✎'}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {editing && (
        <ExpenseForm
          trip={trip}
          initial={editing === 'new' ? undefined : editing}
          onSave={save}
          onDelete={editing === 'new' ? undefined : () => remove(editing.id)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
