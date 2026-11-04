import { useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import type { Trip } from '../domain/types';
import type { TripReport } from '../domain/summary';
import { formatMoney } from '../domain/money';
import { Avatar } from './TripView';
import { EXACT_LIMIT } from '../domain/settle';

export function SettleView({ trip, report }: { trip: Trip; report: TripReport }) {
  const { t, locale } = useI18n();
  const [copied, setCopied] = useState(false);
  const base = trip.baseCurrency;
  const name = (id: string) => trip.members.find((m) => m.id === id)?.name ?? '?';
  const fmt = (n: number) => formatMoney(n, base, locale);
  const maxAbs = Math.max(1, ...report.balances.map((b) => Math.abs(b.net)));

  const copy = async () => {
    const text = [
      `${trip.name} — ${t('transfers')}`,
      ...report.transfers.map((x) => `• ${name(x.from)} → ${name(x.to)}: ${fmt(x.amount)}`),
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="stack">
      <section className="card">
        <div className="card-head">
          <h2>{t('transfers')}</h2>
          {report.transfers.length > 0 && (
            <button className="btn ghost sm" onClick={copy}>
              {copied ? t('copied') : t('copyTransfers')}
            </button>
          )}
        </div>
        {report.transfers.length === 0 ? (
          <p className="empty">{t('allSettled')}</p>
        ) : (
          <>
            <ul className="transfers">
              {report.transfers.map((x, i) => (
                <li key={i} className="transfer">
                  <span className="who">
                    <Avatar name={name(x.from)} size={30} />
                    <span>{name(x.from)}</span>
                  </span>
                  <span className="arrow">
                    <span className="transfer-amt">{fmt(x.amount)}</span>
                    <svg viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
                      <path d="M0 5h96M90 1l6 4-6 4" fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                    </svg>
                    <span className="sr-only">{t('pays')}</span>
                  </span>
                  <span className="who">
                    <Avatar name={name(x.to)} size={30} />
                    <span>{name(x.to)}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="muted small">{t(
                report.balances.filter((b) => b.net !== 0).length > EXACT_LIMIT ? 'transfersHintGreedy' : 'transfersHint',
                { n: report.transfers.length },
              )}</p>
          </>
        )}
      </section>

      <section className="card">
        <h2>{t('balances')}</h2>
        <p className="muted small">{t('balancesHint')}</p>
        <ul className="balances">
          {report.balances.map((b) => {
            const pct = (Math.abs(b.net) / maxAbs) * 50;
            return (
              <li key={b.memberId}>
                <div className="bal-row">
                  <span className="who">
                    <Avatar name={name(b.memberId)} /> {name(b.memberId)}
                  </span>
                  <span className={`bal-amt ${b.net > 0 ? 'pos' : b.net < 0 ? 'neg' : ''}`}>
                    {b.net > 0 ? '+' : ''}
                    {fmt(b.net)}
                  </span>
                </div>
                <div className="bal-bar" aria-hidden="true">
                  <span
                    className={b.net >= 0 ? 'pos' : 'neg'}
                    style={b.net >= 0 ? { left: '50%', width: `${pct}%` } : { right: '50%', width: `${pct}%` }}
                  />
                </div>
                <div className="muted small">
                  {t('paid')} {fmt(b.paid)} · {t('share')} {fmt(b.share)}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
