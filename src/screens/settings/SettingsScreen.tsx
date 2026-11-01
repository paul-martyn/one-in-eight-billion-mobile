// «Settings» — настройки следующей жизни (решение продукта 1 ноября 2026: пока
// только режим рождения, эпоха и длительность жизни). Макета нет: экран нарисован
// в языке LangCute/HubCute. Значения — snapshot.prefs (UI.prefs оригинала: mode,
// era/eraAny/eraY, pace); изменения — команда setLifePref только из обработчиков
// жестов. При открытии экрана команд нет. Настройки действуют со следующей жизни
// (оригинал читает их в startNewLife/newLife).
import { useId, useMemo, useState } from 'react';
import { t, UI_LANG, LOCALE_NAMES } from '../../i18n';
import { gestureId, useAdapter, useSnapshot } from '../../adapters/useGame';
import type { GameAdapter } from '../../adapters/gameAdapter';
import type { LifePrefsView } from '../../adapters/vm/spend';
import { PACE_CHOICES } from '../../app/game';
import { Ribbon, RoundButton } from '../../ui/components';
import { BackIcon, ChevronIcon } from '../../ui/icons';
import type { ScreenProps } from '../registry';
import './settings.css';

type Pref = Parameters<GameAdapter['setLifePref']>[1];
type Era = LifePrefsView['era'];
type Opt<V> = { value: V; label: string; sub?: string; aria?: string };

const ERA_HINT: Record<Era, string> = {
  now: 'settings.hintNow',
  past: 'settings.hintPast',
  future: 'settings.hintFuture',
  any: 'settings.hintAny',
};

export function SettingsScreen({ nav, active }: ScreenProps) {
  const adapter = useAdapter();
  const snap = useSnapshot();
  const ids = useId();
  const prefs = snap.prefs;
  // Текущая валюта оригинала (CUR) для подписи строки «Language & currency».
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const currency = useMemo(() => adapter.currencies().find(c => c.current)?.key ?? null, [adapter, snap.version]);
  const living = snap.lifePhase === 'life' || snap.lifePhase === 'birth' || !!snap.resume;

  // Команда создаётся синхронно в обработчике жеста; повтор того же значения не отправляется.
  const set = (pref: Pref) => {
    if (!active || snap.status !== 'ready') return;
    adapter.setLifePref(gestureId(), pref);
  };
  const back = () => { if (active) nav.back(); };
  const toLanguage = () => { if (active) nav.go({ id: 'language' }); };

  return (
    <main className="screen stg">
      <div className="stg-glow" aria-hidden="true" />
      <header className="stg-head">
        <RoundButton className="stg-back" aria-label={t('settings.back')} onClick={back}><BackIcon size={22} /></RoundButton>
        <div className="stg-ribbon"><Ribbon as="h1">{t('settings.title')}</Ribbon></div>
      </header>

      <div className="stg-scroll scroll">
        {!prefs ? (
          <p className="stg-wait" role="status">{t('settings.loading')}</p>
        ) : (
          <>
            <p className="stg-next">{living ? t('settings.nextLifeKeep') : t('settings.nextLife')}</p>

            <section className="stg-sec" aria-labelledby={`${ids}-where`}>
              <h2 className="eyebrow" id={`${ids}-where`}><span>{t('settings.whereTitle')}</span></h2>
              <div className="stg-card">
                <Segmented
                  labelledBy={`${ids}-where`}
                  value={prefs.mode}
                  onPick={mode => { if (mode !== prefs.mode) set({ mode }); }}
                  options={[
                    { value: 'birth', label: t('settings.modeBirth'), sub: t(prefs.era === 'past' ? 'settings.modeBirthPast' : 'settings.modeBirthNow') },
                    { value: 'pop', label: t('settings.modePop'), sub: t(prefs.era === 'past' ? 'settings.modePopPast' : 'settings.modePopNow') },
                  ]}
                />
              </div>
            </section>

            <section className="stg-sec" aria-labelledby={`${ids}-when`}>
              <h2 className="eyebrow" id={`${ids}-when`}><span>{t('settings.whenTitle')}</span></h2>
              <div className="stg-card">
                <Segmented
                  labelledBy={`${ids}-when`}
                  value={prefs.era}
                  onPick={era => { if (era !== prefs.era) set({ era }); }}
                  options={[
                    { value: 'now', label: t('settings.eraNow') },
                    { value: 'past', label: t('settings.eraPast') },
                    { value: 'future', label: t('settings.eraFuture') },
                    { value: 'any', label: t('settings.eraAny') },
                  ]}
                />
                <p className="stg-hint">{t(ERA_HINT[prefs.era])}</p>
                {prefs.era === 'past' && (
                  <YearControl prefs={prefs} labelId={`${ids}-year`} onSet={eraYear => set({ eraYear })} />
                )}
              </div>
            </section>

            <section className="stg-sec" aria-labelledby={`${ids}-pace`}>
              <h2 className="eyebrow" id={`${ids}-pace`}><span>{t('settings.paceTitle')}</span></h2>
              <div className="stg-card">
                <Segmented
                  labelledBy={`${ids}-pace`}
                  value={prefs.pace}
                  onPick={pace => { if (pace !== prefs.pace) set({ pace }); }}
                  options={PACE_CHOICES.map(n => ({ value: n, label: t('settings.paceMin', { n }), aria: t('settings.paceLabel', { n }) }))}
                />
                <p className="stg-hint">{t('settings.paceNote')}</p>
              </div>
            </section>
          </>
        )}

        <button type="button" className="stg-link" onClick={toLanguage}>
          <span className="stg-link__icon k-os" aria-hidden="true">Aa</span>
          <span className="stg-link__text">
            <span className="stg-link__title">{t('settings.language')}</span>
            <span className="stg-link__sub">{currency ? t('settings.languageSub', { language: LOCALE_NAMES[UI_LANG], currency }) : LOCALE_NAMES[UI_LANG]}</span>
          </span>
          <ChevronIcon size={22} className="stg-link__chev" />
        </button>
      </div>
    </main>
  );
}

/** Сегментированные чипы: выбранный — голубой фон (переключатели макетов). */
function Segmented<V extends string | number>({ labelledBy, value, options, onPick }: {
  labelledBy: string; value: V; options: Opt<V>[]; onPick: (v: V) => void;
}) {
  return (
    <div className="stg-seg" role="group" aria-labelledby={labelledBy}>
      {options.map(o => (
        <button
          key={String(o.value)}
          type="button"
          className={`stg-chip ${o.sub ? 'stg-chip--sub' : ''}`}
          aria-pressed={o.value === value}
          aria-label={o.aria}
          onClick={() => onPick(o.value)}
        >
          <span className="stg-chip__label">{o.label}</span>
          {o.sub && <span className="stg-chip__sub">{o.sub}</span>}
        </button>
      ))}
    </div>
  );
}

/**
 * Год рождения прошлой эпохи: «любой год» (eraY = 'r') или конкретный год
 * yearMin…yearMax. Ползунок показывает черновик во время перетаскивания и
 * отправляет одну команду по окончании (событие change), кнопки −/+ — по нажатию.
 */
function YearControl({ prefs, labelId, onSet }: { prefs: LifePrefsView; labelId: string; onSet: (year: 'r' | number) => void }) {
  const { yearMin: min, yearMax: max, eraYear } = prefs;
  const any = eraYear === 'r';
  const [draft, setDraft] = useState<number | null>(null);
  // Последний конкретный год этой сессии — с него продолжается выбор после «Any year».
  const [last, setLast] = useState<number | null>(typeof eraYear === 'number' ? eraYear : null);
  if (typeof eraYear === 'number' && eraYear !== last) setLast(eraYear);

  const clampYear = (y: number) => Math.min(max, Math.max(min, Math.round(y)));
  const shown = clampYear(draft ?? (typeof eraYear === 'number' ? eraYear : last ?? (min + max) / 2));
  const fill = max > min ? ((shown - min) / (max - min)) * 100 : 0;

  const commit = (y: number) => {
    setDraft(null);
    const v = clampYear(y);
    if (v !== eraYear) onSet(v);
  };
  const pickAny = () => {
    setDraft(null);
    if (!any) onSet('r');
  };
  // Запасной путь, если перетаскивание прервано без события change.
  const settle = (el: HTMLInputElement) => { if (draft != null) commit(Number(el.value)); };

  return (
    <div className="stg-year">
      <h3 className="stg-year__title" id={labelId}>{t('settings.yearTitle')}</h3>
      <div className="stg-year__row" role="group" aria-labelledby={labelId}>
        <button
          type="button"
          className="stg-chip stg-chip--sub stg-year__any"
          aria-pressed={any}
          aria-label={t('settings.yearAnyLabel', { min, max })}
          onClick={pickAny}
        >
          <span className="stg-chip__label">{t('settings.yearAny')}</span>
          <span className="stg-chip__sub tabular">{t('settings.yearRange', { min, max })}</span>
        </button>
        <div className="stg-stepper">
          <button type="button" className="stg-step" aria-label={t('settings.yearDown')} disabled={shown <= min} onClick={() => commit(shown - 1)}>
            <StepGlyph plus={false} />
          </button>
          <button
            type="button"
            className="stg-chip stg-year__num tabular"
            aria-pressed={!any}
            aria-label={t('settings.yearPick', { year: shown })}
            onClick={() => commit(shown)}
          >
            {shown}
          </button>
          <button type="button" className="stg-step" aria-label={t('settings.yearUp')} disabled={shown >= max} onClick={() => commit(shown + 1)}>
            <StepGlyph plus />
          </button>
        </div>
      </div>
      <input
        ref={el => {
          if (!el) return;
          // change у ползунка приходит при отпускании (и на каждый шаг клавиатуры) — одна команда за жест.
          const onRelease = () => commit(Number(el.value));
          el.addEventListener('change', onRelease);
          return () => el.removeEventListener('change', onRelease);
        }}
        type="range"
        className="stg-range"
        min={min}
        max={max}
        step={1}
        value={shown}
        aria-label={t('settings.yearSlider')}
        aria-valuetext={String(shown)}
        style={{ ['--stg-fill' as string]: `${fill}%` }}
        onChange={e => setDraft(Number(e.currentTarget.value))}
        onPointerCancel={e => settle(e.currentTarget)}
        onBlur={e => settle(e.currentTarget)}
      />
      <div className="stg-range__ends tabular" aria-hidden="true"><span>{min}</span><span>{max}</span></div>
      <p className="stg-hint">{any ? t('settings.yearHintAny') : t('settings.yearHintPick', { year: shown })}</p>
    </div>
  );
}

const StepGlyph = ({ plus }: { plus: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path d={plus ? 'M5 12h14M12 5v14' : 'M5 12h14'} stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" />
  </svg>
);
