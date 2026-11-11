// «0 · Language» (LangCute холста): общая планета сверху (под экраном), «Привет!» на
// выбранном языке в комиксном облачке, 19 языков плашками в три колонки с круглыми
// флагами и Continue 196 × 70. Переведены пять языков; остальные показаны
// недоступными. Валюта в макете на этот экран не вынесена, но игре она нужна вместе
// с языком: её выбор — в маленькой кнопке в углу (окно со списком валют оригинала
// для выбранного языка); по умолчанию — валюта, которую оригинал предлагает сам.
import { useMemo, useState, type CSSProperties } from 'react';
import { t, UI_LANG, setLocale, isLocale, type Locale } from '../../i18n';
import { gestureId, useAdapter, useSnapshot } from '../../adapters/useGame';
import { chooseLanguage } from '../../app/game';
import { Popup } from '../../ui/components';
import { Frame, useFrame } from '../../ui/frame/Frame';
import { fitSize, useFontsReady, type Field } from '../../ui/frame/fit';
import { CtaButton } from '../../ui/frame/parts';
import { extrasOf, layLanguage } from '../layouts';
import type { ScreenProps } from '../registry';
import { FLAGS } from './flags';
import './language.css';

// Языки оригинала (19 локалей сборки 0.8.98): название и приветствие на своём языке.
// Сначала переведённые, затем остальные в порядке макета.
const LANGS: { id: string; flag: string; name: string; hi: string; rtl?: boolean }[] = [
  { id: 'en', flag: 'en', name: 'English', hi: 'Hello!' },
  { id: 'ru', flag: 'ru', name: 'Русский', hi: 'Привет!' },
  { id: 'es', flag: 'es', name: 'Español', hi: '¡Hola!' },
  { id: 'fr', flag: 'fr', name: 'Français', hi: 'Salut !' },
  { id: 'de', flag: 'de', name: 'Deutsch', hi: 'Hallo!' },
  { id: 'uk', flag: 'uk', name: 'Українська', hi: 'Привіт!' },
  { id: 'pl', flag: 'pl', name: 'Polski', hi: 'Cześć!' },
  { id: 'it', flag: 'it', name: 'Italiano', hi: 'Ciao!' },
  { id: 'pt', flag: 'pt', name: 'Português', hi: 'Olá!' },
  { id: 'ko', flag: 'ko', name: '한국어', hi: '안녕하세요!' },
  { id: 'ja', flag: 'ja', name: '日本語', hi: 'こんにちは！' },
  { id: 'zh-hant', flag: 'zhHant', name: '繁體中文', hi: '你好！' },
  { id: 'zh-hans', flag: 'zhHans', name: '简体中文', hi: '你好！' },
  { id: 'vi', flag: 'vi', name: 'Tiếng Việt', hi: 'Xin chào!' },
  { id: 'th', flag: 'th', name: 'ไทย', hi: 'สวัสดี!' },
  { id: 'id', flag: 'id', name: 'Indonesia', hi: 'Halo!' },
  { id: 'tr', flag: 'tr', name: 'Türkçe', hi: 'Merhaba!' },
  { id: 'ar', flag: 'ar', name: 'العربية', hi: 'مرحبًا!', rtl: true },
  { id: 'fa', flag: 'fa', name: 'فارسی', hi: 'سلام!', rtl: true },
];
// Поля подгонки кегля: [ширина, наибольший, наименьший] (LangCute FIT).
const CHIP_FIT: Field = [76, 13.5, 10];
const HELLO_FIT: Field = [210, 36, 20];

/**
 * Облачко «Привет!» вокруг слова: от 170 до 260 в ширину, хвост — комиксное остриё
 * под левым краем (LangCute bubble).
 */
function bubble(text: string, size: number) {
  const W = Math.round(Math.max(170, Math.min(260, (fitWidth(text, size)) + 44)));
  const H = 70, p = 1.5, r = 24, tx = 30, tw = 20, tail = 16;
  const top = `M${p + r} ${p}H${W - p - r}A${r} ${r} 0 0 1 ${W - p} ${p + r}V${H - p - r}A${r} ${r} 0 0 1 ${W - p - r} ${H - p}`;
  const left = `H${p + r}A${r} ${r} 0 0 1 ${p} ${H - p - r}V${p + r}A${r} ${r} 0 0 1 ${p + r} ${p}Z`;
  return {
    w: W, h: H + tail + 2,
    path: `${top}H${tx + tw}L${tx + 3} ${H - p + tail}L${tx} ${H - p}${left}`,
    // Только тело — для блика.
    body: top + left,
    cx: W / 2, y: H / 2,
  };
}
/** Ширина слова при кегле size: поле подгонки с шириной 1000 и «наибольшим» кеглем size даёт обратную величину. */
function fitWidth(text: string, size: number): number {
  // fitSize(text, [w, 1e6, 0]) = w / width100 * 100 → width100 = w * 100 / fitSize.
  const probe = fitSize(text, [1000, 1e6, 0]);
  return probe > 0 ? (1000 / probe) * size : text.length * size * 0.6;
}

const Check = ({ size = 18 }: { size?: number }) => (
  <span className="lng-check" style={{ width: size, height: size }} aria-hidden="true">
    <svg width={size / 2} height={size / 2} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
  </span>
);

export function LanguageScreen({ nav, active }: ScreenProps) {
  const adapter = useAdapter();
  const snap = useSnapshot();
  const frame = useFrame();
  useFontsReady();
  const [lang, setLang] = useState<Locale>(UI_LANG);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const currencies = useMemo(() => adapter.currencies(lang), [adapter, snap.version, lang]);
  const current = currencies.find(c => c.current)?.key ?? currencies[0]?.key ?? 'USD';
  const [cur, setCur] = useState<string | null>(null);
  const [curOpen, setCurOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const picked = cur ?? current;
  const pickedCur = currencies.find(c => c.key === picked);
  const extras = extrasOf(snap);
  const fromHub = !!extras.langNote;
  const L = layLanguage(frame, extras);

  const go = async () => {
    if (busy || !active) return;
    setBusy(true);
    const ok = await chooseLanguage(gestureId(), lang, picked);
    setBusy(false);
    if (!ok) { setFailed(true); return; }
    // Открыт из хаба или настроек — вернуться туда же (из настроек во время жизни — обратно к жизни).
    if (nav.canBack()) nav.back();
    else if (fromHub) nav.go({ id: 'hub' }, 'pop');
    else nav.go({ id: 'start' });
  };

  const sel = LANGS.find(l => l.id === lang) ?? LANGS[0]!;
  const hiSize = fitSize(sel.hi, HELLO_FIT);
  const bub = bubble(sel.hi, hiSize);
  const hiText = { x: bub.cx, textAnchor: 'middle' as const, dominantBaseline: 'central' as const, fontSize: hiSize, fontWeight: 700, stroke: '#5a3418', strokeWidth: 4.6, strokeLinejoin: 'round' as const };

  return (
    <main className="pscreen over-planet lng" lang={UI_LANG}>
      <Frame>
        <button type="button" className="lng-cur" style={{ top: Math.max(12, frame.top + 8) }} onClick={() => setCurOpen(true)} disabled={busy} aria-label={`${t('lang.currencyLabel')}: ${pickedCur?.label ?? picked} ${picked}`}>
          <span className="lng-cur__sym" aria-hidden="true">{pickedCur?.sym || picked}</span>
          <span className="lng-cur__code" aria-hidden="true">{picked}</span>
        </button>

        <div className="lng-hello" style={{ top: L.hello }}>
          {/* Новый выбор «выстреливает» облачко заново (key), дальше оно покачивается. */}
          <div key={sel.id} className="lng-hello__pop">
            <div className="lng-hello__bob" dir="ltr">
              <svg width={bub.w} height={bub.h} viewBox={`0 0 ${bub.w} ${bub.h}`} role="img" aria-label={sel.hi} lang={sel.id}>
                <defs>
                  <mask id="lng-shine" maskUnits="userSpaceOnUse" x="0" y="0" width={bub.w} height={bub.h}>
                    <path d={bub.body} fill="#ffffff" />
                    <path d={bub.body} transform="translate(0 5)" fill="#000000" />
                  </mask>
                </defs>
                <g transform={sel.rtl ? `matrix(-1 0 0 1 ${bub.w} 0)` : undefined}>
                  <path d={bub.path} fill="#3ec3d2" />
                </g>
                <path d={bub.body} fill="#ffffff" opacity="0.32" mask="url(#lng-shine)" />
                <g transform={sel.rtl ? `matrix(-1 0 0 1 ${bub.w} 0)` : undefined}>
                  <path d={bub.path} fill="none" stroke="#7b4b2a" strokeWidth="2.5" strokeLinejoin="round" />
                </g>
                <text {...hiText} y={bub.y + 1.5} fill="#5a3418" aria-hidden="true">{sel.hi}</text>
                <text {...hiText} y={bub.y - 1.5} fill="#ffffff" paintOrder="stroke" aria-hidden="true">{sel.hi}</text>
              </svg>
            </div>
          </div>
        </div>

        <div className="lng-chips rise-in" style={{ top: L.chips, animationDelay: '0.2s' }} role="radiogroup" aria-label={t('lang.languagesLabel')}>
          {LANGS.map(l => {
            const on = l.id === lang;
            const avail = isLocale(l.id);
            return (
              <button
                key={l.id}
                type="button"
                role="radio"
                aria-checked={on}
                aria-disabled={!avail}
                disabled={!avail || busy}
                title={avail ? undefined : t('lang.soon')}
                onClick={() => { if (isLocale(l.id)) { setLang(l.id); setLocale(l.id); setCur(null); setFailed(false); } }}
                className={`lng-chip ${on ? 'is-on' : ''}`}
                lang={l.id}
                dir="ltr"
                style={{ fontSize: fitSize(l.name, CHIP_FIT) }}
              >
                <span className="lng-chip__flag" aria-hidden="true" dangerouslySetInnerHTML={{ __html: FLAGS[l.flag] ?? '' }} />
                <span className="lng-chip__name">{l.name}</span>
                {on && <Check />}
              </button>
            );
          })}
        </div>

        {(failed || fromHub) && (
          <p className="lng-note" style={{ top: L.note }} role={failed ? 'alert' : undefined}>{failed ? t('lang.failed') : t('lang.historyHint')}</p>
        )}
        <CtaButton className="lng-go" style={{ top: L.cta }} label={busy ? t('lang.restarting') : t('lang.go')} onClick={go} disabled={busy} aria-busy={busy || undefined} />
      </Frame>

      <Popup open={curOpen} title={t('lang.money')} onClose={() => setCurOpen(false)} closeLabel={t('pause.close')}>
        <p className="lng-money">{t('lang.moneyHint')}</p>
        <div className="lng-curs" role="radiogroup" aria-label={t('lang.currencyLabel')} style={{ '--cols': Math.min(4, Math.max(2, Math.ceil(currencies.length / 3))) } as CSSProperties}>
          {currencies.map(c => {
            const on = c.key === picked;
            return (
              <button key={c.key} type="button" role="radio" aria-checked={on} aria-label={`${c.label} ${c.key}`} className={`lng-curs__item ${on ? 'is-on' : ''}`} onClick={() => { setCur(c.key); setCurOpen(false); }} disabled={busy}>
                <span className={`lng-curs__sym ${c.sym.length >= 3 ? 'is-long' : ''}`}>{c.sym || c.key}</span>
                <span className="lng-curs__code">{c.key}</span>
                {on && <Check />}
              </button>
            );
          })}
        </div>
      </Popup>
    </main>
  );
}
