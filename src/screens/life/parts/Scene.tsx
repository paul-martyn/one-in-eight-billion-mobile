// Шапка вкладки «Жизнь»: сцена, меню, полоса жизни, место рождения, пауза,
// скорость и «до следующего решения», доля прошедшего года.
// Фон нейтральный (небо и земля): крыша Лакхнау из макета изображает один
// конкретный город, окружение пока не генерируется. На земле стоят люди дома
// (sceneModel оригинала) из генератора персонажей; пока детали грузятся —
// прежний инициал игрока в круге.
import { memo, useMemo, useRef } from 'react';
import { t } from '../../../i18n';
import { gestureId, useAdapter, useYearProgress } from '../../../adapters/useGame';
import type { LifeVM } from '../../../adapters/viewModels';
import { householdAppearances } from '../../../adapters/vm/appearance';
import { useSharedCoreView } from '../../../ui/people/hooks';
import { Household, type HouseholdMemberView } from '../../../ui/people/Household';
import { FastGlyph, MenuGlyph, PauseGlyph, PinGlyph, PlayGlyph } from './lifeIcons';

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

/**
 * over — жизнь закончилась (snapshot.lifePhase 'dead', LiveCute frame «died»):
 * пауза, скорость, «до следующего решения» и доля года скрыты, сцена приглушена,
 * значок «You» гаснет, плашка места — «Life ended · …».
 */
export function Scene({ life, k, enabled, over, onMenu }: { life: LifeVM; k: number; enabled: boolean; over: boolean; onMenu: () => void }) {
  const adapter = useAdapter();
  const guard = useTapGuard();
  // Пока открыто решение, core не принимает паузу и «до следующего решения» (время и так стоит).
  // Неактивная копия вкладки закрыта inert; кнопки при этом не тускнеют.
  const blocked = !!life.pending || over;
  const running = !life.paused && !life.pending && !over;

  const openMenu = () => {
    if (!enabled) return;
    onMenu();
  };
  const onPause = () => {
    if (!enabled || blocked || !guard()) return;
    adapter.togglePause(gestureId());
  };
  const onSpeed = () => {
    if (!enabled || blocked) return;
    const list = life.speeds;
    const i = list.indexOf(life.speed);
    const next = list[(i + 1) % list.length] ?? list[0];
    if (next != null) adapter.setSpeed(gestureId(), next);
  };
  const onFast = () => {
    if (!enabled || blocked || !guard()) return;
    adapter.toggleFastForward(gestureId());
  };

  const initial = Array.from(life.given || life.name || '?')[0] ?? '?';
  const chip = t('life.sceneChip', { name: life.given, age: life.age, place: life.place });
  const household = useSharedCoreView(householdAppearances);
  const members = useMemo<HouseholdMemberView[]>(
    () => (household ?? []).map((p, i) => ({ key: `${i}:${p.look?.id ?? p.role}`, look: p.look, me: p.role === 'me' })),
    [household],
  );
  const homeLabel = household && household.length > 1
    ? t('peopleArt.home', { people: household.map(p => t('peopleArt.entry', { role: t(`peopleArt.role.${p.role}`), age: p.age })).join('; ') })
    : '';
  const hero = (
    <div className="lt-hero" aria-hidden="true">
      <span className="lt-hero__you">{t('life.you')}</span>
      <span className="lt-hero__disc"><span className="k-big">{initial}</span></span>
      <span className="lt-hero__shadow" />
    </div>
  );
  const placeChip = !over
    ? t('life.bornIn', { place: life.bornIn })
    : life.year != null
      ? t('death.place', { place: life.place, year: life.year })
      : t('death.placeNoYear', { place: life.place });
  return (
    <header className={`lt-scene ${over ? 'is-over' : ''}`}>
      <SceneArt />
      <div className="lt-scene__top">
        {/* Меню (☰) макета ведёт в настройки. */}
        <button type="button" className="lt-round" aria-label={t('life.menuSettings')} onClick={openMenu}>
          <MenuGlyph />
        </button>
        <div className="lt-scene__mid">
          <LifeBar age={life.age} le={life.lifeExpectancy} k={k} over={over} />
          <p className={`lt-born ${over ? 'is-over' : ''}`}><PinGlyph /><span>{placeChip}</span></p>
        </div>
        {over ? (
          <span className="lt-round-gap" aria-hidden="true" />
        ) : (
          <button
            type="button"
            className="lt-round"
            aria-label={running ? t('life.pause') : t('life.resume')}
            disabled={blocked}
            onClick={onPause}
          >
            {running ? <PauseGlyph /> : <PlayGlyph />}
          </button>
        )}
      </div>

      <Household members={members} badge={<span className="lt-hero__you">{t('life.you')}</span>} label={homeLabel} fallback={hero} />
      <p className="lt-where" title={chip}>
        <span className="sr-only">{t('life.sceneLabel', { name: life.given, age: life.age, place: life.place })}</span>
        <span aria-hidden="true">{chip}</span>
      </p>

      {over ? null : <TimeControls life={life} running={running} blocked={blocked} onFast={onFast} onSpeed={onSpeed} />}
    </header>
  );
}

function TimeControls({ life, running, blocked, onFast, onSpeed }: { life: LifeVM; running: boolean; blocked: boolean; onFast: () => void; onSpeed: () => void }) {
  return (
    <>
      {life.fastForward && <p className="lt-ffbadge" role="status"><FastGlyph />{t('life.ffBadge')}</p>}
      <div className="lt-time">
        <button
          type="button"
          className={`lt-sq lt-sq--ff ${life.fastForward ? 'is-on' : ''}`}
          aria-label={t('life.ff')}
          aria-pressed={life.fastForward}
          disabled={blocked}
          onClick={onFast}
        >
          <FastGlyph />
        </button>
        <button
          type="button"
          className={`lt-sq lt-sq--speed k-os ${running && !life.fastForward ? 'is-on' : ''}`}
          aria-label={t('life.speed', { speed: life.speed })}
          title={t('life.yearPace', { sec: Math.round(life.secondsPerYear) })}
          disabled={blocked}
          onClick={onSpeed}
        >
          {t('life.speedNow', { speed: life.speed })}
        </button>
      </div>
      <YearProgress pace={t('life.yearPace', { sec: Math.round(life.secondsPerYear) })} />
    </>
  );
}

/** Полоса жизни 0–100 лет с отметкой ожидаемой продолжительности при рождении и бегунком возраста. */
export function LifeBar({ age, le, k, over = false }: { age: number; le: number; k: number; over?: boolean }) {
  const fill = Math.max(0, Math.min(100, age * k));
  const lePct = Math.max(0, Math.min(100, le));
  const leShown = Math.round(le);
  return (
    <div
      className="lt-bar"
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={age}
      aria-label={over ? t('death.barLabel', { age, le: leShown }) : t('life.barLabel', { age, le: leShown })}
    >
      <span className="lt-bar__fill" style={{ transform: `scaleX(${fill / 100})` }} />
      <span className="lt-bar__tick" style={{ left: `${lePct}%` }} aria-hidden="true" />
      <span
        className={`lt-bar__le k-os ${lePct > 88 ? 'is-left' : ''}`}
        style={lePct > 88 ? { right: `calc(${100 - lePct}% + 6px)` } : { left: `calc(${lePct}% + 6px)` }}
        aria-hidden="true"
      >
        ~{leShown}
      </span>
      <span className="lt-bar__rail" style={{ transform: `translateX(${fill}%)` }} aria-hidden="true">
        <svg className="lt-bar__knob" width="24" height="24" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="11" fill="#fff" stroke="#7b4b2a" strokeWidth="2" />
          <text x="12" y="16.1" textAnchor="middle" fontSize={age * k >= 99.5 ? 9 : 11.5} fontWeight="700" fill="#5a3418">{Math.round(age * k)}</text>
        </svg>
      </span>
    </div>
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

/** Нейтральные небо и земля в палитре макета (без города и людей). */
const SceneArt = memo(function SceneArt() {
  return (
    <div className="lt-art" aria-hidden="true">
      <span className="lt-art__sun" />
      <svg className="lt-art__cloud lt-art__cloud--a" width="74" height="30" viewBox="0 0 74 30"><path d="M10 28c-5 0-8-3-8-7s3.5-7 8-6.5C11 8 16 4 22 4c5 0 9 2.6 11 6.5C35 7 39 5 44 5c7 0 12 5 12 11 1-.2 2-.3 3-.3 6 0 11 2.8 11 6.3S65 28 59 28Z" fill="#fff" opacity="0.92" /></svg>
      <svg className="lt-art__cloud lt-art__cloud--b" width="54" height="22" viewBox="0 0 74 30"><path d="M10 28c-5 0-8-3-8-7s3.5-7 8-6.5C11 8 16 4 22 4c5 0 9 2.6 11 6.5C35 7 39 5 44 5c7 0 12 5 12 11 1-.2 2-.3 3-.3 6 0 11 2.8 11 6.3S65 28 59 28Z" fill="#fff" opacity="0.8" /></svg>
      <svg className="lt-art__hills" viewBox="0 0 393 60" preserveAspectRatio="none">
        <path d="M0 38 C40 18 80 14 130 30 C170 42 200 22 245 16 C300 10 340 30 393 24 V60 H0 Z" fill="#cfe7bf" />
        <path d="M0 48 C60 34 110 40 160 46 C220 52 260 34 320 36 C350 37 375 42 393 40 V60 H0 Z" fill="#b5dba2" />
      </svg>
      <span className="lt-art__ground" />
    </div>
  );
});
