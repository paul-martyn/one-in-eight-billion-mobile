// Шапка вкладки «Жизнь» (LiveCute холста, вариант B2): светлый фон с мягким светом за
// семьёй, наверху — четыре показателя силуэтами с числом внутри, на земле — люди дома
// (sceneModel оригинала) из генератора персонажей, справа внизу — квадратные кнопки:
// «до следующего решения», пауза и скорость. Полосы жизни, плашки места и кнопки меню
// в этом варианте нет; возраст виден в заголовках журнала. Пока детали персонажей
// грузятся — инициал игрока в круге.
import { useMemo, useRef } from 'react';
import { t } from '../../../i18n';
import { gestureId, useAdapter, useYearProgress } from '../../../adapters/useGame';
import type { LifeVM } from '../../../adapters/viewModels';
import { householdAppearances } from '../../../adapters/vm/appearance';
import type { StatKey } from '../../../ui/components';
import { useSharedCoreView } from '../../../ui/people/hooks';
import { Household, type HouseholdMemberView } from '../../../ui/people/Household';
import { SIL } from '../../birthOdds/oddsArt';
import { FastGlyph, PauseGlyph, PlayGlyph } from './lifeIcons';

/** Повторное нажатие на переключатель в пределах 350 мс игнорируется. */
function useTapGuard(ms = 350) {
  const last = useRef(-Infinity);
  return () => {
    const now = performance.now();
    if (now - last.current < ms) return false;
    last.current = now;
    return true;
  };
}

export type StatFlash = { id: number; d: Partial<Record<StatKey, number>> };
/** Показатель оригинала → силуэт макета и сдвиг числа к середине силуэта. */
const STATS: { key: StatKey; art: string; dy: number }[] = [
  { key: 'hl', art: 'health', dy: -3 }, { key: 'h', art: 'joy', dy: 2 }, { key: 'sm', art: 'mind', dy: 1 }, { key: 'so', art: 'ties', dy: 5 },
];
const SIZE = 58;

/** Четыре показателя наверху: силуэт заполняется по значению, число — внутри. */
function TopStats({ life, k, flash }: { life: LifeVM; k: number; flash: StatFlash | null }) {
  return (
    <div className="lt-top" role="group" aria-label={t('life.stats', { name: life.given })}>
      {STATS.map(({ key, art, dy }) => {
        const a = SIL[art]!, s = SIZE / a.box, v = life.stats[key], d = flash?.d[key];
        return (
          <span key={key} className="lt-stat" role="meter" aria-label={t(`stat.${key}`)} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v)}>
            <span className="lt-stat__sil" aria-hidden="true" style={{ width: a.box, height: a.box, transform: `scale(${s})` }}>
              <span dangerouslySetInnerHTML={{ __html: a.base }} />
              <span className="lt-stat__fill" style={{ height: a.b0 + Math.max(0, Math.min(1, (v / 100) * k)) * a.span }}>
                <span dangerouslySetInnerHTML={{ __html: a.fill }} />
              </span>
            </span>
            <b className="lt-stat__n" aria-hidden="true" style={{ top: dy }}>{Math.round(v * k)}</b>
            {d ? <span key={flash!.id} className="lt-stat__d" data-up={d > 0 || undefined} aria-hidden="true">{d > 0 ? `+${d}` : `−${Math.abs(d)}`}</span> : null}
          </span>
        );
      })}
    </div>
  );
}

/**
 * over — жизнь закончилась (snapshot.lifePhase 'dead'): кнопки времени скрыты,
 * сцена приглушена, значок «You» гаснет.
 */
export function Scene({ life, k, enabled, over, flash }: { life: LifeVM; k: number; enabled: boolean; over: boolean; flash: StatFlash | null }) {
  const adapter = useAdapter();
  const guard = useTapGuard();
  // Пока открыто решение, core не принимает паузу и «до следующего решения» (время и так стоит).
  const blocked = !!life.pending || over;
  const running = !life.paused && !life.pending && !over;

  const onPause = () => {
    if (!enabled || blocked || !guard()) return;
    adapter.togglePause(gestureId());
  };
  const onSpeed = () => {
    if (!enabled || blocked) return;
    const list = life.speeds;
    const next = list[(list.indexOf(life.speed) + 1) % list.length] ?? list[0];
    if (next != null) adapter.setSpeed(gestureId(), next);
  };
  const onFast = () => {
    if (!enabled || blocked || !guard()) return;
    adapter.toggleFastForward(gestureId());
  };

  const initial = Array.from(life.given || life.name || '?')[0] ?? '?';
  const household = useSharedCoreView(householdAppearances);
  const members = useMemo<HouseholdMemberView[]>(
    () => (household ?? []).map((p, i) => ({ key: `${i}:${p.look?.id ?? p.role}`, look: p.look, me: p.role === 'me' })),
    [household],
  );
  const homeLabel = household && household.length > 1
    ? t('peopleArt.home', { people: household.map(p => t('peopleArt.entry', { role: t(`peopleArt.role.${p.role}`), age: p.age })).join('; ') })
    : t('life.sceneLabel', { name: life.given, age: life.age, place: life.place });
  const hero = (
    <div className="lt-hero" aria-hidden="true">
      <span className="lt-hero__you">{t('life.you')}</span>
      <span className="lt-hero__disc"><span className="k-big">{initial}</span></span>
      <span className="lt-hero__shadow" />
    </div>
  );
  return (
    <header className={`lt-scene ${over ? 'is-over' : ''}`}>
      <div className="lt-art" aria-hidden="true"><span className="lt-art__light" /></div>
      <TopStats life={life} k={k} flash={flash} />
      <Household members={members} badge={<span className="lt-hero__you">{t('life.you')}</span>} label={homeLabel} fallback={hero} />
      {over ? null : (
        <>
          {life.fastForward && <p className="lt-ffbadge" role="status"><FastGlyph />{t('life.ffBadge')}</p>}
          <div className="lt-time">
            <button type="button" className={`lt-sq ${life.fastForward ? 'is-on' : ''}`} aria-label={t('life.ff')} aria-pressed={life.fastForward} disabled={blocked} onClick={onFast}>
              <FastGlyph />
            </button>
            <button type="button" className="lt-sq" aria-label={running ? t('life.pause') : t('life.resume')} disabled={blocked} onClick={onPause}>
              {running ? <PauseGlyph /> : <PlayGlyph />}
            </button>
            <button type="button" className="lt-sq lt-sq--speed" aria-label={t('life.speed', { speed: life.speed })} title={t('life.yearPace', { sec: Math.round(life.secondsPerYear) })} disabled={blocked} onClick={onSpeed}>
              {t('life.speedNow', { speed: life.speed })}
            </button>
          </div>
          <YearProgress pace={t('life.yearPace', { sec: Math.round(life.secondsPerYear) })} />
        </>
      )}
    </header>
  );
}

/** Тонкая полоса доли текущего года (S.t), обновляется каждый кадр отдельно от снимка. */
function YearProgress({ pace }: { pace: string }) {
  const p = useYearProgress();
  const pct = Math.round(p * 100);
  return (
    <div className="lt-year" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={t('life.yearProgress', { pct, pace })}>
      <span className="lt-year__fill" style={{ transform: `scaleX(${p})` }} />
    </div>
  );
}

/**
 * Фокус года под шапкой (FOCUS оригинала, команда setFocus): варианты зависят от
 * возраста и занятия; пока выбирать нельзя (младенчество), решает семья.
 */
export function FocusRow({ life, enabled }: { life: LifeVM; enabled: boolean }) {
  const adapter = useAdapter();
  const opts = life.focus.options;
  const pick = (key: string) => {
    const now = adapter.getSnapshot();
    if (!enabled || now.lifePhase !== 'life' || !now.life || now.life.focus.current === key) return;
    adapter.setFocus(gestureId(), key);
  };
  return (
    <section className="lt-focus" aria-label={t('activities.focus.title')}>
      <p className="lt-focus__title">{t('activities.focus.title')}</p>
      {opts.length ? (
        <div className="lt-focus__row" role="group" aria-label={t('activities.focus.title')} data-many={opts.length > 5 || undefined}>
          {opts.map(o => (
            <button key={o.k} type="button" className="lt-focus__btn" aria-pressed={life.focus.current === o.k} title={o.desc} disabled={!enabled} onClick={() => pick(o.k)}>
              <span>{o.name}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="lt-focus__none">{t('life.focusFamily')}</p>
      )}
    </section>
  );
}
