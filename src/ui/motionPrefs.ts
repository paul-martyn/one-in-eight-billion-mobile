// Предпочтение сокращённого движения: системная настройка или выбор в игре.
// Влияет только на представление; состояние игры от него не зависит.
import { useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();
let forced: boolean | null = null;

function systemReduced() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
export function isReducedMotion() {
  return forced ?? systemReduced();
}
export function setReducedMotion(value: boolean | null) {
  forced = value;
  if (typeof document !== 'undefined') {
    if (value) document.documentElement.dataset.motion = 'reduced';
    else delete document.documentElement.dataset.motion;
  }
  listeners.forEach(l => l());
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  mq?.addEventListener('change', cb);
  return () => { listeners.delete(cb); mq?.removeEventListener('change', cb); };
}
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, isReducedMotion, () => false);
}
