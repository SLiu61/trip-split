import { useI18n } from './i18n/I18nContext';
import { useRoute, useTrips } from './store';
import { Home } from './components/Home';
import { TripView } from './components/TripView';

export function App() {
  const { lang, setLang, t } = useI18n();
  const store = useTrips();
  const [route, navigate] = useRoute();
  const trip = route.tripId ? store.trips.find((x) => x.id === route.tripId) : undefined;

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="#/" aria-label="TripSplit home">
          <svg viewBox="0 0 64 64" width="28" height="28" aria-hidden="true">
            <rect width="64" height="64" rx="14" fill="var(--accent)" />
            <path d="M18 22h28M32 22v24" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
            <circle cx="46" cy="44" r="6" fill="#fbbf24" />
          </svg>
          <span>TripSplit</span>
        </a>
        <div className="lang-toggle" role="group" aria-label="Language">
          <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')} aria-pressed={lang === 'en'}>
            EN
          </button>
          <button className={lang === 'zh' ? 'on' : ''} onClick={() => setLang('zh')} aria-pressed={lang === 'zh'}>
            中文
          </button>
        </div>
      </header>

      <main className="container">
        {trip ? (
          <TripView
            trip={trip}
            tab={route.tab}
            onTab={(tab) => navigate({ tripId: trip.id, tab })}
            onBack={() => navigate({ tab: 'expenses' })}
            updateTrip={(fn) => store.updateTrip(trip.id, fn)}
            onDelete={() => {
              store.deleteTrip(trip.id);
              navigate({ tab: 'expenses' });
            }}
            onResetSample={() => store.loadSample()}
          />
        ) : (
          <Home
            trips={store.trips}
            onOpen={(id) => navigate({ tripId: id, tab: 'expenses' })}
            onCreate={(tr) => {
              store.upsertTrip(tr);
              navigate({ tripId: tr.id, tab: 'expenses' });
            }}
            onSample={() => navigate({ tripId: store.loadSample(), tab: 'settle' })}
          />
        )}
      </main>

      <footer className="footer">
        <span>{t('dataLocal')}</span>
        <a href="https://github.com/sliu61/trip-split" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </footer>
    </div>
  );
}
