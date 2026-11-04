import { useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { CURRENCIES } from '../domain/money';
import type { Trip } from '../domain/types';
import { newId } from '../store';

interface Props {
  onCreate: (trip: Trip) => void;
  onCancel: () => void;
}

export function NewTripForm({ onCreate, onCancel }: Props) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [base, setBase] = useState('EUR');
  const [members, setMembers] = useState<string[]>(['', '']);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const names = members.map((m) => m.trim()).filter(Boolean);
    if (!name.trim()) return setError(t('needName'));
    if (names.length < 2) return setError(t('needTwoMembers'));
    if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) return setError(t('duplicateMember'));
    onCreate({
      id: newId('t'),
      name: name.trim(),
      baseCurrency: base,
      members: names.map((n) => ({ id: newId('m'), name: n })),
      expenses: [],
      createdAt: Date.now(),
    });
  };

  return (
    <form onSubmit={submit} className="form">
      <label className="field">
        <span>{t('tripName')}</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('tripNamePlaceholder')} autoFocus />
      </label>
      <label className="field">
        <span>{t('baseCurrency')}</span>
        <select value={base} onChange={(e) => setBase(e.target.value)}>
          {CURRENCIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <small className="muted">{t('baseCurrencyHint')}</small>
      </label>
      <fieldset className="field">
        <legend>{t('members')}</legend>
        {members.map((m, i) => (
          <div className="row" key={i}>
            <input
              value={m}
              placeholder={`${t('memberPlaceholder')} ${i + 1}`}
              onChange={(e) => setMembers(members.map((x, j) => (j === i ? e.target.value : x)))}
            />
            {members.length > 2 && (
              <button type="button" className="btn ghost icon" aria-label={t('remove')} onClick={() => setMembers(members.filter((_, j) => j !== i))}>
                ✕
              </button>
            )}
          </div>
        ))}
        <button type="button" className="btn ghost" onClick={() => setMembers([...members, ''])}>
          + {t('addMember')}
        </button>
      </fieldset>
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button type="button" className="btn" onClick={onCancel}>
          {t('cancel')}
        </button>
        <button type="submit" className="btn primary">
          {t('create')}
        </button>
      </div>
    </form>
  );
}
