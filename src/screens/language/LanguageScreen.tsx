// «0 · Language & currency» (LangCute.dc.html). Язык: в этой версии работает
// только английский — остальные 18 языков оригинала показаны, но недоступны.
// Валюта: настоящий выбор оригинала (CUR_SETS.en, one8b.cur.en).
import { useMemo, useState, type CSSProperties } from 'react';
import { t } from '../../i18n';
import { gestureId, useAdapter, useSnapshot } from '../../adapters/useGame';
import { chooseCurrency } from '../../app/game';
import { ChunkyButton, Ribbon } from '../../ui/components';
import type { ScreenProps } from '../registry';
import './language.css';

// Языки оригинала (19 локалей сборки 0.8.98), название на своём языке.
const LANGS: { id: string; short: string; name: string; en: string; dir?: 'rtl' }[] = [
  { id: 'en', short: 'EN', name: 'English', en: 'English' },
  { id: 'ru', short: 'RU', name: 'Русский', en: 'Russian' },
  { id: 'uk', short: 'UA', name: 'Українська', en: 'Ukrainian' },
  { id: 'pl', short: 'PL', name: 'Polski', en: 'Polish' },
  { id: 'de', short: 'DE', name: 'Deutsch', en: 'German' },
  { id: 'fr', short: 'FR', name: 'Français', en: 'French' },
  { id: 'es', short: 'ES', name: 'Español', en: 'Spanish' },
  { id: 'it', short: 'IT', name: 'Italiano', en: 'Italian' },
  { id: 'pt', short: 'PT', name: 'Português (Brasil)', en: 'Portuguese (Brazil)' },
  { id: 'ko', short: 'KO', name: '한국어', en: 'Korean' },
  { id: 'ja', short: 'JA', name: '日本語', en: 'Japanese' },
  { id: 'zh-hant', short: '繁', name: '繁體中文', en: 'Chinese (Traditional)' },
  { id: 'zh-hans', short: '简', name: '简体中文', en: 'Chinese (Simplified)' },
  { id: 'vi', short: 'VI', name: 'Tiếng Việt', en: 'Vietnamese' },
  { id: 'th', short: 'TH', name: 'ไทย', en: 'Thai' },
  { id: 'id', short: 'ID', name: 'Bahasa Indonesia', en: 'Indonesian' },
  { id: 'tr', short: 'TR', name: 'Türkçe', en: 'Turkish' },
  { id: 'ar', short: 'AR', name: 'العربية', en: 'Arabic', dir: 'rtl' },
  { id: 'fa', short: 'FA', name: 'فارسی', en: 'Persian', dir: 'rtl' },
];
const DOTS = ['#ff6b6b', '#5fa2ff', '#ffd75a', '#8fd14f', '#b48cff', '#3ec3d2', '#f4a940'];

const Check = ({ size = 20 }: { size?: number }) => (
  <span className="lang__check" style={{ width: size, height: size }} aria-hidden="true">
    <svg width={size - 6} height={size - 6} viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg>
  </span>
);

export function LanguageScreen({ nav, active }: ScreenProps) {
  const adapter = useAdapter();
  const snap = useSnapshot();
  const currencies = useMemo(() => adapter.currencies(), [adapter, snap.version]);
  const current = currencies.find(c => c.current)?.key ?? currencies[0]?.key ?? 'USD';
  const [cur, setCur] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const picked = cur ?? current;
  const fromHub = snap.pastLives.length > 0 || !!snap.resume;

  const go = async () => {
    if (busy || !active) return;
    setBusy(true);
    const ok = await chooseCurrency(gestureId(), picked);
    setBusy(false);
    if (!ok) return;
    // Открыт из хаба или настроек — вернуться туда же (из настроек во время жизни — обратно к жизни).
    if (nav.canBack()) nav.back();
    else if (fromHub) nav.go({ id: 'hub' }, 'pop');
    else nav.go({ id: 'start' });
  };

  return (
    <main className="screen lang" lang="en">
      <div className="lang__glow" aria-hidden="true" />
      <div className="lang__badge" aria-hidden="true">
        <svg width="54" height="46" viewBox="0 0 54 46">
          <path d="M4 6h24a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4H14l-7 6v-6H4a4 4 0 0 1-4-4V10a4 4 0 0 1 4-4Z" transform="translate(2 0)" fill="#3ec3d2" stroke="#7b4b2a" strokeWidth="2" />
          <text x="18" y="23" textAnchor="middle" fontSize="15" fontWeight="700" fill="#fff" stroke="#5a3418" strokeWidth="2.4" paintOrder="stroke">文</text>
          <path d="M26 16h22a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4h-3v6l-7-6H26a4 4 0 0 1-4-4V20a4 4 0 0 1 4-4Z" fill="#ffd75a" stroke="#7b4b2a" strokeWidth="2" />
          <text x="37" y="33" textAnchor="middle" fontSize="13" fontWeight="700" fill="#fff" stroke="#5a3418" strokeWidth="2.4" paintOrder="stroke">Aa</text>
        </svg>
      </div>
      <div className="lang__ribbon"><Ribbon as="h1">{t('lang.title')}</Ribbon></div>

      <section className="lang__panel" aria-label={t('lang.languagesLabel')}>
        <div className="lang__list scroll" role="radiogroup" aria-label={t('lang.languagesLabel')}>
          {LANGS.map((l, i) => {
            const on = l.id === 'en';
            const avail = l.id === 'en';
            return (
              <button
                key={l.id}
                type="button"
                role="radio"
                aria-checked={on}
                aria-disabled={!avail}
                disabled={!avail}
                className={`lang__chip ${on ? 'is-on' : ''}`}
                lang={l.id}
                dir={l.dir ?? 'auto'}
              >
                <span className="lang__dot k-os" style={{ background: DOTS[i % DOTS.length] }}>{l.short}</span>
                <span className="lang__names">
                  <span className={`lang__name ${l.name.length >= 14 ? 'is-long' : ''}`}>{l.name}</span>
                  <span className="lang__sub">{avail ? t('lang.device') : t('lang.soon')}</span>
                </span>
                {on && <Check />}
              </button>
            );
          })}
        </div>
        <div className="lang__fade" aria-hidden="true" />
      </section>

      <p className="lang__money k-os">{t('lang.money')} <span className="lang__hint">{t('lang.moneyHint')}</span></p>
      <div className="lang__curs" role="radiogroup" aria-label={t('lang.currencyLabel')} style={{ '--cols': Math.ceil(currencies.length / 2) } as CSSProperties}>
        {currencies.map(c => {
          const on = c.key === picked;
          return (
            <button
              key={c.key}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`${c.label} ${c.key}`}
              className={`lang__cur ${on ? 'is-on' : ''}`}
              onClick={() => setCur(c.key)}
              disabled={busy}
            >
              <span className={`lang__sym ${c.sym.length >= 3 ? 'is-long' : ''}`}>{c.sym || c.key}</span>
              <span className="lang__code">{c.key}</span>
              {on && <Check size={18} />}
            </button>
          );
        })}
      </div>

      <div className="lang__cta">
        <ChunkyButton onClick={go} disabled={busy} aria-busy={busy}>{busy ? t('lang.restarting') : t('lang.go')}</ChunkyButton>
      </div>
    </main>
  );
}
