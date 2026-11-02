import { useI18n } from '../i18n/I18nContext';
import type { Trip } from '../domain/types';
import type { TripReport } from '../domain/summary';
import { formatMoney } from '../domain/money';
import { CATEGORY_ICON } from './ExpenseList';
import { Avatar } from './TripView';

export function SummaryView({ trip, report }: { trip: Trip; report: TripReport }) {
  const { t, locale } = useI18n();
  const base = trip.baseCurrency;
  const fmt = (n: number) => formatMoney(n, base, locale);
  const name = (id: string) => trip.members.find((m) => m.id === id)?.name ?? '?';
  const cats = report.byCategory.filter((c) => c.count > 0).sort((a, b) => b.total - a.total);
  const maxCat = Math.max(1, ...cats.map((c) => c.total));
  const maxMember = Math.max(1, ...report.balances.flatMap((b) => [b.paid, b.share]));
  const pct = (n: number) => (report.total ? `${((n / report.total) * 100).toFixed(1)}%` : '—');
  const perPerson = trip.members.length ? Math.round(report.total / trip.members.length) : 0;

  const checks: [boolean, string][] = [
    [report.checks.sharesEqualTotal, t('checkShares')],
    [report.checks.balancesSumToZero, t('checkBalances')],
    [report.checks.transfersSettleAll, t('checkTransfers')],
  ];

  return (
    <div className="stack">
      <div className="tiles">
        <div className="tile">
          <span className="muted small">{t('totalSpent')}</span>
          <strong>{fmt(report.total)}</strong>
        </div>
        <div className="tile">
          <span className="muted small">{t('perPerson')}</span>
          <strong>{fmt(perPerson)}</strong>
        </div>
        <div className="tile">
          <span className="muted small">{t('biggestCategory')}</span>
          <strong>{cats[0] ? `${CATEGORY_ICON[cats[0].category]} ${t(`cat_${cats[0].category}`)}` : '—'}</strong>
        </div>
      </div>

      <section className="card">
        <h2>{t('byCategory')}</h2>
        <ul className="bars">
          {cats.map((c) => (
            <li key={c.category}>
              <div className="bar-label">
                <span>
                  {CATEGORY_ICON[c.category]} {t(`cat_${c.category}`)} <span className="muted small">· {c.count}</span>
                </span>
                <span>
                  <strong>{fmt(c.total)}</strong> <span className="muted small">{pct(c.total)}</span>
                </span>
              </div>
              <div className="bar">
                <span style={{ width: `${(c.total / maxCat) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>{t('byMember')}</h2>
        <div className="legend small">
          <span><i className="sw paid" /> {t('paid')}</span>
          <span><i className="sw share" /> {t('share')}</span>
        </div>
        <ul className="bars">
          {report.balances.map((b) => (
            <li key={b.memberId}>
              <div className="bar-label">
                <span className="who">
                  <Avatar name={name(b.memberId)} /> {name(b.memberId)}
                </span>
                <span className="small">
                  {fmt(b.paid)} / {fmt(b.share)}
                </span>
              </div>
              <div className="bar thin paid">
                <span style={{ width: `${(b.paid / maxMember) * 100}%` }} />
              </div>
              <div className="bar thin share">
                <span style={{ width: `${(b.share / maxMember) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>{t('byCurrency')}</h2>
        <table className="table">
          <tbody>
            {report.byCurrency.map((c) => (
              <tr key={c.currency}>
                <td>
                  <strong>{c.currency}</strong> <span className="muted small">· {c.count}</span>
                </td>
                <td className="num">{formatMoney(c.originalTotal, c.currency, locale)}</td>
                <td className="num">{fmt(c.baseTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>{t('reconciliation')}</h2>
        <ul className="checks">
          {checks.map(([ok, label]) => (
            <li key={label} className={ok ? 'ok' : 'fail'}>
              <span aria-hidden="true">{ok ? '✓' : '✗'}</span> {label}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
