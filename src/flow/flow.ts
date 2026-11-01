// Экранный flow. Хранит только UI-состояние: какой экран открыт, откуда
// пришли, какой переход играть. Персонаж, время и решения живут в core.
import motion from '../design/motion.json';

export type LifeTab = 'people' | 'activities' | 'life' | 'money' | 'odds';
export type ScreenId = 'loading' | 'error' | 'language' | 'settings' | 'start' | 'roll' | 'certificate' | 'birthOdds' | 'life' | 'ended' | 'hub';

export type Screen =
  | { id: 'loading' }
  | { id: 'error' }
  | { id: 'language' }
  | { id: 'settings' }
  | { id: 'start' }
  | { id: 'roll' }
  | { id: 'certificate'; filled: boolean }
  | { id: 'birthOdds' }
  | { id: 'life'; tab: LifeTab }
  | { id: 'ended' }
  | { id: 'hub' };

export type TransitionKind = 'none' | 'fade' | 'tab' | 'rise' | 'push' | 'pop' | 'zoom';

export type FlowState = {
  screen: Screen;
  /** Экран, который уходит (держится смонтированным до конца перехода). */
  leaving: Screen | null;
  transition: TransitionKind;
  /** Растёт с каждым переходом; ключ для анимаций. */
  seq: number;
  /** Стек возврата для push/pop. */
  stack: Screen[];
};

export type FlowAction =
  | { type: 'go'; to: Screen; kind?: TransitionKind }
  | { type: 'back' }
  | { type: 'settled'; seq: number };

const LIFE_TABS = new Set(['life']);
/** Тип перехода по таблице холста дизайна (Prototype.dc.html kindFor). */
export function kindFor(from: Screen, to: Screen): TransitionKind {
  if (from.id === 'loading' || from.id === 'error') return 'fade';
  if (LIFE_TABS.has(from.id) && LIFE_TABS.has(to.id)) return 'tab';
  if (from.id === 'roll' && to.id === 'certificate') return 'rise';
  if ((from.id === 'certificate' && to.id === 'birthOdds') || (from.id === 'hub' && to.id === 'language') || to.id === 'settings' || (from.id === 'settings' && to.id === 'language')) return 'push';
  if ((from.id === 'birthOdds' && to.id === 'certificate') || (from.id === 'language' && to.id === 'hub') || from.id === 'settings') return 'pop';
  if ((from.id === 'certificate' || from.id === 'birthOdds') && to.id === 'life') return 'zoom';
  // Итоги жизни выезжают снизу (макет v107).
  if (from.id === 'life' && to.id === 'ended') return 'rise';
  return 'fade';
}

export function transitionMs(kind: TransitionKind): number {
  if (kind === 'none') return 0;
  const id = `screen.${kind}`;
  return motion.screenTransitions.find(t => t.id === id)?.durationMs ?? 380;
}

export const initialFlow: FlowState = { screen: { id: 'loading' }, leaving: null, transition: 'none', seq: 0, stack: [] };

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case 'go': {
      if (sameScreen(state.screen, action.to)) return state;
      const kind = action.kind ?? kindFor(state.screen, action.to);
      const stack = kind === 'push' ? [...state.stack, state.screen] : kind === 'pop' ? state.stack.slice(0, -1) : [];
      // Новый переход во время текущего: уходящий экран заменяется сразу.
      return { screen: action.to, leaving: kind === 'none' ? null : state.screen, transition: kind, seq: state.seq + 1, stack };
    }
    case 'back': {
      const prev = state.stack[state.stack.length - 1];
      if (!prev) return state;
      return { screen: prev, leaving: state.screen, transition: 'pop', seq: state.seq + 1, stack: state.stack.slice(0, -1) };
    }
    case 'settled':
      return action.seq === state.seq ? { ...state, leaving: null } : state;
  }
}

export function sameScreen(a: Screen, b: Screen): boolean {
  if (a.id !== b.id) return false;
  if (a.id === 'life' && b.id === 'life') return a.tab === b.tab;
  if (a.id === 'certificate' && b.id === 'certificate') return a.filled === b.filled;
  return true;
}
