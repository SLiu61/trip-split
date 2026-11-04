import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { CATEGORIES, type Category, type Expense, type RateSource, type Split, type SplitMode, type Trip } from '../domain/types';
import { CURRENCIES, formatMoney, toMinor } from '../domain/money';
import { computeExpense, validateExpense } from '../domain/split';
import { fetchRate, todayISO } from '../domain/rates';
import { newId } from '../store';
import { CATEGORY_ICON } from './ExpenseList';
import { Avatar } from './TripView';

interface Props {
  trip: Trip;
  initial?: Expense;
  onSave: (e: Expense) => void;
  onDelete?: () => void;
  onClose: () => void;
}

/** Accepts "12.50", "12,50" and "1 234,5". */
function parseNum(s: string): number {
  const cleaned = s.replace(/[\s ']/g, '').replace(',', '.');
  if (cleaned === '') return NaN;
  return Number(cleaned);
}
const str = (n: number | undefined) => (n === undefined || Number.isNaN(n) ? '' : String(n));

interface RateState {
  rate: number;
  source: RateSource;
  rateDate?: string;
  status: 'ok' | 'loading' | 'error';
  /** date|currency the rate belongs to — used to know when to refetch */
  key: string;
}

export function ExpenseForm({ trip, initial, onSave, onDelete, onClose }: Props) {
  const { t, locale } = useI18n();
  const base = trip.baseCurrency;
  const memberIds = trip.members.map((m) => m.id);
  const lastCurrency = useMemo(
    () => [...trip.expenses].sort((a, b) => b.createdAt - a.createdAt)[0]?.currency ?? base,
    [trip.expenses, base],
  );

  const [description, setDescription] = useState(initial?.description ?? '');
  const [amount, setAmount] = useState(str(initial?.amount));
  const [currency, setCurrency] = useState(initial?.currency ?? lastCurrency);
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [payerId, setPayerId] = useState(initial?.payerId ?? memberIds[0]);
  const [category, setCategory] = useState<Category>(initial?.category ?? 'food');

  const [mode, setMode] = useState<SplitMode>(initial?.split.mode ?? 'equal');
  const [participants, setParticipants] = useState<string[]>(
    initial?.split.mode === 'equal' ? initial.split.participants : memberIds,
  );
  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
    initial?.split.mode === 'amount'
      ? Object.fromEntries(Object.entries(initial.split.amounts).map(([k, v]) => [k, str(v)]))
      : {},
  );
  const [shares, setShares] = useState<Record<string, string>>(() =>
    initial?.split.mode === 'shares'
      ? Object.fromEntries(Object.entries(initial.split.shares).map(([k, v]) => [k, str(v)]))
      : Object.fromEntries(memberIds.map((id) => [id, '1'])),
  );

  const rateKey = `${date}|${currency}`;
  const [rate, setRate] = useState<RateState>(() =>
    initial
      ? { rate: initial.rate, source: initial.rateSource, rateDate: initial.rateDate, status: 'ok', key: `${initial.date}|${initial.currency}` }
      : { rate: currency === base ? 1 : NaN, source: currency === base ? 'same' : 'api', status: 'ok', key: '' },
  );
  const [manualStr, setManualStr] = useState(initial?.rateSource === 'manual' ? str(initial.rate) : '');
  const [showErrors, setShowErrors] = useState(false);
  const reqId = useRef(0);

  // Fetch the ECB rate whenever date/currency change (unless the user overrode it).
  useEffect(() => {
    if (currency === base) {
      setRate({ rate: 1, source: 'same', status: 'ok', key: rateKey });
      return;
    }
    if (rate.source === 'manual') return;
    if (rate.key === rateKey && rate.source === 'api') return; // already fetched / fetching / failed for this key
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    const id = ++reqId.current;
    setRate((r) => ({ ...r, source: 'api', status: 'loading', key: rateKey }));
    fetchRate(date, currency, base)
      .then((res) => {
        if (id === reqId.current) setRate({ rate: res.rate, rateDate: res.rateDate, source: 'api', status: 'ok', key: rateKey });
      })
      .catch(() => {
        if (id === reqId.current) setRate((r) => ({ ...r, rate: NaN, status: 'error', key: rateKey }));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rateKey, base, rate.source, rate.key]);

  const effectiveRate = rate.source === 'manual' ? parseNum(manualStr) : rate.rate;

  const split: Split =
    mode === 'equal'
      ? { mode, participants }
      : mode === 'amount'
        ? {
            mode,
            amounts: Object.fromEntries(
              Object.entries(amounts)
                .filter(([, v]) => v.trim() !== '')
                .map(([k, v]) => [k, parseNum(v)]),
            ),
          }
        : {
            mode,
            shares: Object.fromEntries(
              Object.entries(shares)
                .filter(([, v]) => v.trim() !== '')
                .map(([k, v]) => [k, parseNum(v)]),
            ),
          };

  const draft: Expense = {
    id: initial?.id ?? newId('e'),
    description: description.trim(),
    amount: parseNum(amount),
    currency,
    date,
    payerId,
    category,
    split,
    rate: currency === base ? 1 : effectiveRate,
    rateSource: currency === base ? 'same' : rate.source,
    rateDate: currency === base || rate.source === 'manual' ? undefined : rate.rateDate,
    createdAt: initial?.createdAt ?? Date.now(),
  };

  const validation = validateExpense(draft, memberIds);
  const rateReady = currency === base || rate.source === 'manual' || rate.status === 'ok';
  const preview = validation.ok && rateReady ? computeExpense(draft, base, memberIds) : null;
  const descError = draft.description === '';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.ok || descError || !rateReady) {
      setShowErrors(true);
      return;
    }
    onSave(draft);
  };

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const remainder = validation.error === 'amountMismatch' ? validation.remainderMinor ?? 0 : 0;
  const fmtRate = (r: number) => (Number.isFinite(r) ? r.toLocaleString(locale, { maximumSignificantDigits: 8 }) : '—');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="exp-title" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={submit} className="form">
          <div className="modal-head">
            <h2 id="exp-title">{initial ? t('editExpense') : t('addExpense')}</h2>
            <button type="button" className="btn ghost icon" onClick={onClose} aria-label={t('cancel')}>
              ✕
            </button>
          </div>

          <label className="field">
            <span>{t('description')}</span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('descriptionPlaceholder')}
              autoFocus={!initial}
            />
            {showErrors && descError && <small className="error">{t('error_description')}</small>}
          </label>

          <div className="grid-2">
            <label className="field">
              <span>{t('amount')}</span>
              <div className="amount-input">
                <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} aria-label={t('currency')}>
                  {CURRENCIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </label>
            <label className="field">
              <span>{t('date')}</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </label>
          </div>

          {currency !== base && (
            <div className={`rate-box ${rate.source === 'manual' ? 'manual' : ''}`}>
              <div className="rate-top">
                <span className="small strong">{t('exchangeRate')}</span>
                {rate.source === 'manual' ? (
                  <button
                    type="button"
                    className="link"
                    onClick={() => setRate((r) => ({ ...r, source: 'api', status: 'loading', key: '' }))}
                  >
                    {t('useApiRate')}
                  </button>
                ) : (
                  <span className="rate-actions">
                    <button
                      type="button"
                      className="link"
                      onClick={() => setRate((r) => ({ ...r, source: 'api', status: 'loading', key: '' }))}
                    >
                      {t('refetch')}
                    </button>
                    <button
                      type="button"
                      className="link"
                      onClick={() => {
                        setManualStr(Number.isFinite(rate.rate) ? String(rate.rate) : '');
                        setRate((r) => ({ ...r, source: 'manual' }));
                      }}
                    >
                      {t('overrideRate')}
                    </button>
                  </span>
                )}
              </div>
              {rate.source === 'manual' ? (
                <div className="rate-manual">
                  <span>1 {currency} =</span>
                  <input inputMode="decimal" value={manualStr} onChange={(e) => setManualStr(e.target.value)} autoFocus />
                  <span>{base}</span>
                </div>
              ) : rate.status === 'loading' ? (
                <div className="muted">{t('rateLoading')}</div>
              ) : rate.status === 'error' ? (
                <div className="error small">{t('rateFailed')}</div>
              ) : (
                <div>
                  <strong>{t('rateLine', { from: currency, rate: fmtRate(rate.rate), to: base })}</strong>{' '}
                  <span className="muted small">· {t('rateFromApi', { date: rate.rateDate ?? date })}</span>
                </div>
              )}
              <small className="muted">{t('rateStoredNote')}</small>
            </div>
          )}

          <div className="grid-2">
            <label className="field">
              <span>{t('paidBy')}</span>
              <select value={payerId} onChange={(e) => setPayerId(e.target.value)}>
                {trip.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="field">
              <span>{t('category')}</span>
              <div className="cat-picker" role="radiogroup" aria-label={t('category')}>
                {CATEGORIES.map((c) => (
                  <button
                    type="button"
                    key={c}
                    role="radio"
                    aria-checked={category === c}
                    className={category === c ? 'on' : ''}
                    onClick={() => setCategory(c)}
                    title={t(`cat_${c}`)}
                  >
                    <span aria-hidden="true">{CATEGORY_ICON[c]}</span>
                    <span className="cat-label">{t(`cat_${c}`)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="field">
            <div className="split-head">
              <span>{t('splitHow')}</span>
              <div className="segmented" role="tablist">
                {(['equal', 'amount', 'shares'] as SplitMode[]).map((m) => (
                  <button
                    type="button"
                    key={m}
                    role="tab"
                    aria-selected={mode === m}
                    className={mode === m ? 'on' : ''}
                    onClick={() => setMode(m)}
                  >
                    {t(m === 'equal' ? 'splitEqual' : m === 'amount' ? 'splitAmount' : 'splitShares')}
                  </button>
                ))}
              </div>
            </div>

            {mode === 'equal' && (
              <div className="quick">
                <button type="button" className="link" onClick={() => setParticipants(memberIds)}>
                  {t('selectAll')}
                </button>
                <button type="button" className="link" onClick={() => setParticipants([])}>
                  {t('selectNone')}
                </button>
              </div>
            )}

            <ul className="split-list">
              {trip.members.map((m) => {
                const share = preview?.shares[m.id];
                return (
                  <li key={m.id}>
                    {mode === 'equal' ? (
                      <label className="split-member">
                        <input
                          type="checkbox"
                          checked={participants.includes(m.id)}
                          onChange={(e) =>
                            setParticipants(
                              e.target.checked ? [...participants, m.id] : participants.filter((x) => x !== m.id),
                            )
                          }
                        />
                        <Avatar name={m.name} /> {m.name}
                      </label>
                    ) : (
                      <span className="split-member">
                        <Avatar name={m.name} /> {m.name}
                      </span>
                    )}
                    {mode === 'amount' && (
                      <span className="split-input">
                        <input
                          inputMode="decimal"
                          value={amounts[m.id] ?? ''}
                          placeholder="0"
                          onChange={(e) => setAmounts({ ...amounts, [m.id]: e.target.value })}
                          aria-label={`${m.name} ${t('amount')}`}
                        />
                        <span className="muted small">{currency}</span>
                      </span>
                    )}
                    {mode === 'shares' && (
                      <span className="split-input">
                        <input
                          inputMode="decimal"
                          value={shares[m.id] ?? ''}
                          placeholder="0"
                          onChange={(e) => setShares({ ...shares, [m.id]: e.target.value })}
                          aria-label={`${m.name} ${t('splitShares')}`}
                        />
                        <span className="muted small">×</span>
                      </span>
                    )}
                    <span className="split-preview">{share !== undefined ? formatMoney(share, base, locale) : '—'}</span>
                  </li>
                );
              })}
            </ul>

            {mode === 'amount' && remainder !== 0 && (
              <p className={remainder > 0 ? 'warn small' : 'error small'}>
                {t(remainder > 0 ? 'remaining' : 'overAssigned', {
                  amount: formatMoney(Math.abs(remainder), currency, locale),
                })}
              </p>
            )}
            {preview && currency !== base && (
              <p className="muted small">
                = {formatMoney(preview.baseTotal, base, locale)} ({formatMoney(toMinor(draft.amount, currency), currency, locale)})
              </p>
            )}
          </div>

          {showErrors && !validation.ok && validation.error && (
            <p className="error">{t(`error_${validation.error}`)}</p>
          )}

          <div className="actions">
            {onDelete && (
              <button
                type="button"
                className="btn danger ghost"
                onClick={() => window.confirm(t('confirmDeleteExpense')) && onDelete()}
              >
                {t('delete')}
              </button>
            )}
            <span className="spacer" />
            <button type="button" className="btn" onClick={onClose}>
              {t('cancel')}
            </button>
            <button type="submit" className="btn primary">
              {t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
