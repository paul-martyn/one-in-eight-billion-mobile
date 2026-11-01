// Хост экранов: текущий и уходящий экран, переходы из motion.json.
// Переход — только представление: команды игры уже применены до него.
// Новая навигация во время перехода мгновенно завершает текущий.
import { useCallback, useEffect, useMemo, useReducer, useRef, type ComponentType } from 'react';
import { motion, type Easing } from 'motion/react';
import spec from '../design/motion.json';
import { flowReducer, initialFlow, transitionMs, type FlowState, type Screen, type TransitionKind } from './flow';
import { useReducedMotion } from '../ui/motionPrefs';
import { useAdapter, useSnapshot } from '../adapters/useGame';
import { SCREENS, type ScreenProps } from '../screens/registry';

export type Nav = {
  go(to: Screen, kind?: TransitionKind): void;
  back(): void;
  /** Есть ли экран под текущим (открыт поверх другого push-переходом). */
  canBack(): boolean;
};

type Pose = { opacity?: number; x?: string; y?: string; scale?: number; filter?: string };
const EASE: Record<string, Easing> = {
  fade: 'easeInOut', tab: 'easeInOut', zoom: 'easeOut',
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
    case 'none': return { enterFrom: {}, enterTo: {}, leaveTo: null };
    default: return { enterFrom: { opacity: 0 }, enterTo: { opacity: 1 }, leaveTo: null };
  }
}

const key = (s: Screen) => (s.id === 'life' ? 'life' : s.id);

export function FlowHost() {
  const [flow, dispatch] = useReducer(flowReducer, initialFlow);
  const snap = useSnapshot();
  const reduced = useReducedMotion();
  const adapter = useAdapter();

  const depth = useRef(0);
  depth.current = flow.stack.length;
  const nav = useMemo<Nav>(() => ({
    go: (to, kind) => dispatch({ type: 'go', to, kind }),
    back: () => dispatch({ type: 'back' }),
    canBack: () => depth.current > 0,
  }), []);

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
    const ms = reduced ? 0 : transitionMs(flow.transition) + 60;
    const id = setTimeout(() => settle(flow.seq), ms);
    return () => clearTimeout(id);
  }, [flow.leaving, flow.seq, flow.transition, reduced, settle]);

  return (
    <div className="flow" data-screen={flow.screen.id}>
      {flow.leaving && <Layer key={`leave-${key(flow.leaving)}-${flow.seq}`} flow={flow} screen={flow.leaving} leaving nav={nav} reduced={reduced} onDone={settle} />}
      <Layer key={`cur-${key(flow.screen)}`} flow={flow} screen={flow.screen} leaving={false} nav={nav} reduced={reduced} onDone={settle} />
    </div>
  );
}

function Layer({ flow, screen, leaving, nav, reduced, onDone }: { flow: FlowState; screen: Screen; leaving: boolean; nav: Nav; reduced: boolean; onDone: (seq: number) => void }) {
  const kind = reduced ? 'none' : flow.transition;
  const p = poses(kind);
  const duration = transitionMs(kind) / 1000;
  const Comp = SCREENS[screen.id] as ComponentType<ScreenProps>;
  const seq = flow.seq;
  // Уходящий экран: над новым только при pop (как в прототипе холста).
  const z = leaving ? (kind === 'pop' ? 3 : 1) : 2;
  const initial = leaving ? false : (p.enterFrom as Record<string, unknown>);
  const animate = leaving ? (p.leaveTo ?? {}) : p.enterTo;
  return (
    <motion.div
      className="flow__layer"
      style={{ zIndex: z, pointerEvents: leaving ? 'none' : 'auto' }}
      aria-hidden={leaving || undefined}
      inert={leaving || undefined}
      initial={initial as never}
      animate={animate as never}
      transition={{ duration, ease: EASE[kind] ?? 'easeInOut' }}
      onAnimationComplete={() => { if (!leaving) onDone(seq); }}
    >
      <Comp screen={screen} nav={nav} active={!leaving} />
    </motion.div>
  );
}
