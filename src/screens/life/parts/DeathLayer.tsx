// Конец жизни на экране жизни (LiveCute.dc.html v107, frame «died»; README
// «Смерть»). Только чтение: снимок адаптера (lifePhase, ended) и данные die()
// оригинала через deathView; команд здесь нет.
//   1. Жизнь замирает: управление временем и меню скрыты (LifeTab, LifeScreen),
//      сцена приглушена, сверху журнала — последняя запись.
//   2. Через 0,9 с (касание ускоряет) — окно смерти почти чёрного фиолетового
//      цвета: черепок, «Life ended», портрет, имя и годы, карточка причины.
//   3. Кнопка становится активной через 0,5 с.
//   4. Удержание пальца на пустом месте прячет окно, пока палец лежит.
//   5. Look back → итоги жизни (переход «rise» задаёт flow).
import { useEffect, useId, useRef, useState, type PointerEvent } from 'react';
import { t } from '../../../i18n';
import { useCoreView, useSnapshot } from '../../../adapters/useGame';
import { deathView } from '../../../adapters/vm/death';
import { playerAppearance } from '../../../adapters/vm/appearance';
import { PersonPortrait } from '../../../ui/people/PersonArt';
import { useReducedMotion } from '../../../ui/motionPrefs';
import { CandleGlyph, HoldGlyph, LookBackGlyph, SkullGlyph, SmallSkullGlyph } from './lifeIcons';

/** LiveCute v107 (HOLD_MS, READY_MS): сколько жизнь стоит замершей до окна и сколько кнопки окна не принимают касаний. */
const HOLD_MS = 900;
const READY_MS = 500;

/** Звёзды фона окна (точки макета в кадре 393 × 852): x, y, размер, задержка мерцания. */
const STARS: [number, number, number, number][] = [
  [40, 70, 10, 0], [322, 58, 12, 0.6], [86, 196, 8, 1.2], [306, 182, 9, 0.3],
  [28, 300, 7, 0.9], [356, 290, 8, 1.5], [198, 40, 7, 0.4], [272, 250, 6, 1.1],
];

/**
 * settled — копия экрана, которая уходит под итоги жизни (переход «rise»):
 * окно уже стоит, без анимаций и фокуса, ввод закрыт хостом flow.
 */
export function DeathLayer({ onLookBack, settled = false }: { onLookBack: () => void; settled?: boolean }) {
  const reduced = useReducedMotion();
  // При сокращённом движении последовательность сразу в конечном состоянии (motion.json inputPolicy).
  const [stage, setStage] = useState<'dying' | 'popup'>(() => (reduced || settled ? 'popup' : 'dying'));
  useEffect(() => {
    if (stage !== 'dying') return;
    const id = setTimeout(() => setStage('popup'), HOLD_MS);
    return () => clearTimeout(id);
  }, [stage]);
  if (stage === 'dying') {
    return <button type="button" className="lfd-dim" aria-label={t('death.continue')} onClick={() => setStage('popup')} />;
  }
  return <DeathDialog onLookBack={onLookBack} still={reduced || settled} settled={settled} />;
}

function DeathDialog({ onLookBack, still, settled }: { onLookBack: () => void; still: boolean; settled: boolean }) {
  const snap = useSnapshot();
  const vm = useCoreView(deathView);
  const look = useCoreView(playerAppearance);
  const titleId = useId();
  const causeId = useId();
  const ref = useRef<HTMLElement | null>(null);
  const went = useRef(false);
  const [ready, setReady] = useState(false);
  const [peek, setPeek] = useState(false);

  useEffect(() => {
    if (settled) return;
    const id = setTimeout(() => setReady(true), READY_MS);
    return () => clearTimeout(id);
  }, [settled]);
  useEffect(() => {
    if (!settled) ref.current?.focus({ preventScroll: true });
  }, [settled]);

  // Основной источник — deathView (S.deathAt, die оригинала); запасной — snapshot.ended (endedVM).
  const ended = snap.ended;
  const name = vm?.name || ended?.name || snap.life?.name || '';
  const given = vm?.given || snap.life?.given || name;
  const age = vm?.age ?? ended?.age ?? snap.life?.age ?? 0;
  const cause = vm?.cause || ended?.cause || '';
  const years = vm && vm.born != null && vm.died != null
    ? t('death.years', { born: vm.born, died: vm.died, age })
    : t('death.diedAt', { age });
  const initial = Array.from(given || '?')[0] ?? '?';

  // Удержание на пустом месте (не на кнопке) прячет окно, пока палец лежит.
  const down = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const target = e.target as Element | null;
    if (target && target.closest('a, button')) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* указатель уже отпущен */ }
    setPeek(true);
  };
  const up = () => setPeek(false);
  const lookBack = () => {
    if (!ready || went.current) return;
    went.current = true;
    onLookBack();
  };

  return (
    <section
      ref={ref}
      className={`lfd ${peek ? 'is-peek' : ''} ${still ? 'is-still' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={cause ? causeId : undefined}
      tabIndex={-1}
      onPointerDown={down}
      onPointerUp={up}
      onPointerCancel={up}
      onLostPointerCapture={up}
      onContextMenu={e => e.preventDefault()}
    >
      <div className="lfd__bg" aria-hidden="true">
        {STARS.map(([x, y, s, d], i) => (
          <svg key={i} className="lfd__star" width={s} height={s} viewBox="0 0 24 24" style={{ left: `${(x / 393) * 100}%`, top: `${(y / 852) * 100}%`, animationDelay: `${d}s` }}>
            <path d="M12 1.5l2.4 8.1 8.1 2.4-8.1 2.4-2.4 8.1-2.4-8.1-8.1-2.4 8.1-2.4Z" fill="#fff3d6" />
          </svg>
        ))}
      </div>
      <div className="lfd__col">
        <div className="lfd__skull" aria-hidden="true">
          <span className="lfd__glow" />
          <span className="lfd__float"><span className="lfd__disc"><SkullGlyph /></span></span>
        </div>
        <h2 id={titleId} className="lfd__title">{t('death.title')}</h2>
        <div className="lfd__who">
          <span className="lfd__face">
            <PersonPortrait look={look} size={56} fallback={<span className="lfd__initial k-big" aria-hidden="true">{initial}</span>} />
          </span>
          <span className="lfd__names">
            <span className="lfd__name k-o">{name}</span>
            <span className="lfd__years">{years}</span>
          </span>
        </div>
        {cause ? (
          <div className="lfd__cause" id={causeId}>
            <p className="lfd__cause-title"><CandleGlyph /><span>{t('death.cause', { cause })}</span></p>
            {vm?.share ? <p className="lfd__cause-text">{vm.share}</p> : null}
            {vm?.note ? <p className="lfd__cause-text">{vm.note}</p> : null}
          </div>
        ) : null}
        <p className="lfd__hold" aria-hidden="true">
          <span className="lfd__hold-icon">
            <span className="lfd__ring" />
            <span className="lfd__ring lfd__ring--late" />
            <span className="lfd__hand"><HoldGlyph /></span>
          </span>
          {t('death.hold')}
        </p>
        <div className={`lfd__actions ${ready ? 'is-ready' : ''}`}>
          <button type="button" className="lfd__cta" aria-disabled={ready ? undefined : true} onClick={lookBack}>
            <LookBackGlyph />
            <span className="k-o">{t('death.lookBack')}</span>
          </button>
        </div>
      </div>
    </section>
  );
}

/** Нижняя плашка вместо стикер-меню после смерти (LiveCute v107, lifeOver). */
export function LifeOverBar({ onLookBack }: { onLookBack: () => void }) {
  return (
    <div className="lfd-bar" role="group" aria-label={t('death.barRegion')}>
      <span className="lfd-bar__chip"><SmallSkullGlyph />{t('death.title')}</span>
      <button type="button" className="lfd-bar__cta" onClick={onLookBack}>
        <LookBackGlyph size={22} />
        <span className="k-o">{t('death.summary')}</span>
      </button>
    </div>
  );
}
