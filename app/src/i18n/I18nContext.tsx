import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { makeT, type Lang, type TFunc } from './messages';

interface I18n {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: TFunc;
  /** BCP 47 locale for Intl number/date formatting */
  locale: string;
}

const LANG_KEY = 'tripsplit.lang';
const Ctx = createContext<I18n | null>(null);

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'en' || saved === 'zh') return saved;
  } catch {
    /* ignore */
  }
  return navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initialLang);
  useEffect(() => {
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  }, [lang]);
  const value = useMemo(
    () => ({ lang, setLang, t: makeT(lang), locale: lang === 'zh' ? 'zh-CN' : 'en-GB' }),
    [lang],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const v = useContext(Ctx);
  if (!v) throw new Error('useI18n outside provider');
  return v;
}
