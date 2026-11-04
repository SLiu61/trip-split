import { useMemo, useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import type { Trip } from '../domain/types';
import type { Tab } from '../store';
import { buildReport } from '../domain/summary';
import { formatMoney } from '../domain/money';
import { downloadXlsx } from '../domain/export';
import { ExpenseList } from './ExpenseList';
import { SettleView } from './SettleView';
import { SummaryView } from './SummaryView';
import { SettingsView } from './SettingsView';

interface Props {
  trip: Trip;
  tab: Tab;
  onTab: (t: Tab) => void;
  onBack: () => void;
  updateTrip: (fn: (t: Trip) => Trip) => void;
  onDelete: () => void;
  onResetSample: () => void;
}

export function TripView({ trip, tab, onTab, onBack, updateTrip, onDelete, onResetSample }: Props) {
  const { t, locale } = useI18n();
  const report = useMemo(() => buildReport(trip), [trip]);
  const [exporting, setExporting] = useState(false);

  const doExport = async () => {
    setExporting(true);
    try {
      await downloadXlsx(trip, t);
    } finally {
      setExporting(false);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'expenses', label: t('tabExpenses') },
    { id: 'settle', label: t('tabSettle') },
    { id: 'summary', label: t('tabSummary') },
    { id: 'settings', label: t('tabSettings') },
  ];

  return (
    <div className="trip">
      <button className="btn ghost back" onClick={onBack}>
        ← {t('back')}
      </button>
      <div className="trip-header">
        <div>
          <h1>
            {trip.name} {trip.isSample && <span className="badge">{t('sample')}</span>}
          </h1>
          <div className="chips">
            {trip.members.map((m) => (
              <span key={m.id} className="chip">
                <Avatar name={m.name} /> {m.name}
              </span>
            ))}
          </div>
        </div>
        <div className="trip-header-side">
          <div className="stat">
            <span className="muted small">{t('totalSpent')}</span>
            <strong>{formatMoney(report.total, trip.baseCurrency, locale)}</strong>
          </div>
          <button className="btn" onClick={doExport} disabled={exporting || trip.expenses.length === 0}>
            ⬇ {exporting ? t('exporting') : t('exportXlsx')}
          </button>
        </div>
      </div>

      <nav className="tabs" role="tablist">
        {tabs.map((x) => (
          <button key={x.id} role="tab" aria-selected={tab === x.id} className={tab === x.id ? 'on' : ''} onClick={() => onTab(x.id)}>
            {x.label}
          </button>
        ))}
      </nav>

      {tab === 'expenses' && <ExpenseList trip={trip} report={report} updateTrip={updateTrip} />}
      {tab === 'settle' && <SettleView trip={trip} report={report} />}
      {tab === 'summary' && <SummaryView trip={trip} report={report} />}
      {tab === 'settings' && (
        <SettingsView trip={trip} updateTrip={updateTrip} onDelete={onDelete} onResetSample={onResetSample} />
      )}
    </div>
  );
}

const AVATAR_COLORS = ['#0f766e', '#7c3aed', '#c2410c', '#2563eb', '#be123c', '#4d7c0f', '#a16207', '#0e7490'];

export function Avatar({ name, size = 22 }: { name: string; size?: number }) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const bg = AVATAR_COLORS[h % AVATAR_COLORS.length];
  return (
    <span className="avatar" style={{ background: bg, width: size, height: size, fontSize: size * 0.5 }} aria-hidden="true">
      {[...name][0]?.toUpperCase()}
    </span>
  );
}
