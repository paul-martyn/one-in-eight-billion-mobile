// Хост экранов: текущий и уходящий экран, переходы из motion.json.
// Переход — только представление: команды игры уже применены до него.
// Новая навигация во время перехода мгновенно завершает текущий.
// Экраны нового флоу рисуются в кадре макета 393 × H (src/ui/frame); под экранами
// языка, старта и хаба живёт одна общая планета (PlanetStage).
import { useCallback, useEffect, useMemo, useReducer, useRef, type ComponentType } from 'react';
import { motion, type Easing } from 'motion/react';
import spec from '../design/motion.json';
import { flowReducer, initialFlow, transitionMs, type FlowState, type Screen, type TransitionKind } from './flow';
import { useReducedMotion } from '../ui/motionPrefs';
import { useAdapter, useSnapshot } from '../adapters/useGame';
import { SCREENS, type ScreenProps } from '../screens/registry';
import { useBack, useBackKey } from './useBack';
import { hasPlanet } from '../screens/layouts';
import { FrameProvider, frameVars, useFrameBox } from '../ui/frame/Frame';
import { PlanetStage } from './PlanetStage';

export type Nav = {
  go(to: Screen, kind?: TransitionKind): void;
  back(): void;
  /** Есть ли экран под текущим (открыт поверх другого push-переходом). */
  canBack(): boolean;
};

type Pose = { opacity?: number; x?: string; y?: string; scale?: number; filter?: string };
const GLIDE = spec.screenTransitions.find(x => x.id === 'screen.glide');
const GLIDE_IN = { duration: (GLIDE?.enter?.durationMs ?? 460) / 1000, delay: (GLIDE?.enter?.delayMs ?? 220) / 1000 };
const GLIDE_OUT = { duration: (GLIDE?.exit?.durationMs ?? 320) / 1000 };
const EASE: Record<string, Easing> = {
  fade: 'easeInOut', tab: 'easeInOut', zoom: 'easeOut', glide: spec.easing.ease as [number, number, number, number], birth: spec.easing.ease as [number, number, number, number],
  rise: spec.easing.screen as [number, number, number, number],
  push: spec.easing.screen as [number, number, number, number],
  pop: spec.easing.screen as [number, number, number, number],
};
function poses(kind: TransitionKind): { enterFrom: Pose; enterTo: Pose; leaveTo: Pose | null } {
  switch (kind) {
    case 'rise': return { enterFrom: { y: '100%' }, enterTo: { y: '0%' }, leaveTo: null };
    case 'push': return { enterFrom: { x: '100%' }, enterTo: { x: '0%' }, leaveTo: { x: '-30%', filter: 'brightness(0.8)' } };
    case 'pop': return { enterFrom: { x: '-30%', filter: 'brightness(0.8)' }, enterTo: { x: '0%', filter: 'brightness(1)' }, leaveTo: { x: '100%' } };
    case 'zoom': return { enterFrom: { opacity: 0, scale: 1.08 }, enterTo: { opacity: 1, scale: 1 }, leaveTo: null };
    case 'glide': case 'birth': return { enterFrom: { opacity: 0 }, enterTo: { opacity: 1 }, leaveTo: { opacity: 0 } };
    case 'none': return { enterFrom: {}, enterTo: {}, leaveTo: null };
    default: return { enterFrom: { opacity: 0 }, enterTo: { opacity: 1 }, leaveTo: null };
  }
}

const key = (s: Screen) => (s.id === 'life' ? 'life' : s.id);

/**
 * Как переход выглядит. Между экранами с общей планетой — glide (интерфейсы сменяются,
 * планета перелетает). Экран с планетой не «въезжает» сбоку: планета под ним стоит на
 * месте, поэтому push к нему и pop от него показываются как fade.
 */
function visualKind(flow: FlowState): TransitionKind {
  const k = flow.transition;
  if (k === 'none' || !flow.leaving) return k;
  const to = hasPlanet(flow.screen.id), from = hasPlanet(flow.leaving.id);
  if (to && from) return 'glide';
  if ((to && k === 'push') || (from && k === 'pop')) return 'fade';
  return k;
}

export function FlowHost() {
  const [flow, dispatch] = useReducer(flowReducer, initialFlow);
  const snap = useSnapshot();
  const reduced = useReducedMotion();
  const adapter = useAdapter();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const probeRef = useRef<HTMLElement | null>(null);
  const frame = useFrameBox(hostRef, probeRef);
  const kind = reduced ? 'none' : visualKind(flow);

  const depth = useRef(0);
  depth.current = flow.stack.length;
  const nav = useMemo<Nav>(() => ({
    go: (to, kind) => dispatch({ type: 'go', to, kind }),
    back: () => dispatch({ type: 'back' }),
    canBack: () => depth.current > 0,
  }), []);

  // «Назад» (Esc): окна и экраны регистрируют свои обработчики выше; последний
  // уровень — стек экранов, открытых поверх (push), снимается переходом pop.
  useBackKey();
  useBack(() => {
    if (!nav.canBack()) return false;
    nav.back();
  }, { layer: 'flow' });

  // Первый экран после загрузки core и честный экран ошибки.
  useEffect(() => {
    if (snap.status === 'error') { dispatch({ type: 'go', to: { id: 'error' }, kind: 'fade' }); return; }
    if (snap.status !== 'ready' || flow.screen.id !== 'loading') return;
    if (snap.lifePhase === 'life') dispatch({ type: 'go', to: { id: 'life', tab: 'life' }, kind: 'fade' });
    else if (snap.lifePhase === 'birth') dispatch({ type: 'go', to: { id: 'certificate', filled: true }, kind: 'fade' });
    // Хаб: есть что продолжить, прошлые жизни или неполученная награда за жизнь.
    else if (snap.resume || snap.pastLives.length || snap.meta?.pendingReward) dispatch({ type: 'go', to: { id: 'hub' }, kind: 'fade' });
    // Первый запуск: язык и валюта (выбор валюты ещё не сохранён).
    else if (adapter.currencyKey() == null) dispatch({ type: 'go', to: { id: 'language' }, kind: 'fade' });
    else dispatch({ type: 'go', to: { id: 'start' }, kind: 'fade' });
  }, [snap.status, snap.lifePhase, snap.resume, snap.pastLives.length, snap.meta, flow.screen.id, adapter]);

  // Смерть показывается на экране жизни (макет v107, frame «died»): если игрок был
  // на другой вкладке, возвращаемся на вкладку Life. Дальше — Look back → итоги.
  useEffect(() => {
    if (snap.lifePhase === 'dead' && flow.screen.id === 'life' && flow.screen.tab !== 'life') dispatch({ type: 'go', to: { id: 'life', tab: 'life' }, kind: 'tab' });
  }, [snap.lifePhase, flow.screen]);

  const settle = useCallback((seq: number) => dispatch({ type: 'settled', seq }), []);

  // Снятие уходящего экрана не зависит от onAnimationComplete: таймер — основной путь.
  useEffect(() => {
    if (!flow.leaving) return;
    const ms = transitionMs(kind) + (kind === 'none' ? 0 : 60);
    const id = setTimeout(() => settle(flow.seq), ms);
    return () => clearTimeout(id);
  }, [flow.leaving, flow.seq, kind, settle]);

  return (
    <div ref={hostRef} className="flow" data-screen={flow.screen.id} style={frameVars(frame)}>
      <i ref={probeRef} className="frame-probe" aria-hidden="true" />
      <FrameProvider value={frame}>
        <PlanetStage flow={flow} kind={kind} />
        {flow.leaving && <Layer key={`leave-${key(flow.leaving)}-${flow.seq}`} flow={flow} kind={kind} screen={flow.leaving} leaving nav={nav} onDone={settle} />}
        <Layer key={`cur-${key(flow.screen)}`} flow={flow} kind={kind} screen={flow.screen} leaving={false} nav={nav} onDone={settle} />
      </FrameProvider>
    </div>
  );
}

function Layer({ flow, kind, screen, leaving, nav, onDone }: { flow: FlowState; kind: TransitionKind; screen: Screen; leaving: boolean; nav: Nav; onDone: (seq: number) => void }) {
  const p = poses(kind);
  const duration = transitionMs(kind) / 1000;
  const Comp = SCREENS[screen.id] as ComponentType<ScreenProps>;
  const seq = flow.seq;
  const planet = hasPlanet(screen.id);
  // Уходящий экран: над новым только при pop (как в прототипе холста). Планета — между ними (5 или 15).
  const z = leaving ? (kind === 'pop' ? 30 : 10) : 20;
  // Экран с планетой не сдвигается (планета под ним остаётся на месте).
  const still = planet && (kind === 'push' || kind === 'pop');
  const initial = leaving || still ? false : (p.enterFrom as Record<string, unknown>);
  const animate = still ? {} : leaving ? (p.leaveTo ?? {}) : p.enterTo;
  const timing = kind === 'glide' ? (leaving ? GLIDE_OUT : GLIDE_IN) : kind === 'birth' && leaving ? { duration: 0.2 } : { duration };
  return (
    <motion.div
      className="flow__layer"
      style={{ zIndex: z, pointerEvents: leaving || planet ? 'none' : 'auto' }}
      aria-hidden={leaving || undefined}
      inert={leaving || undefined}
      initial={initial as never}
      animate={animate as never}
      transition={{ ...timing, ease: EASE[kind] ?? 'easeInOut' }}
      onAnimationComplete={() => { if (!leaving) onDone(seq); }}
    >
      <Comp screen={screen} nav={nav} active={!leaving} />
    </motion.div>
  );
}
