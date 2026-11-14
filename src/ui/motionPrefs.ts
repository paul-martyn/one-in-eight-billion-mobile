// Сокращённое движение — только по выбору в игре (или ?motion=reduced в адресе).
// Системную настройку «уменьшить движение» (prefers-reduced-motion) игра не учитывает
// (решение 14 ноября 2026): анимации — часть игры и показываются всегда.
// Влияет только на представление; состояние игры от него не зависит.
import { useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();
let forced: boolean | null = null;

export function isReducedMotion() {
  return forced ?? false;
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
  return () => { listeners.delete(cb); };
}
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, isReducedMotion, () => false);
}
