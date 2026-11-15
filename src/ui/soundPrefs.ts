// Звук и музыка — выбор игрока из окна паузы (15 ноября 2026). Звука и музыки в игре пока нет: здесь только
// запомненный выбор, чтобы будущий звук сразу его учитывал. Хранится на устройстве (ключи с префиксом
// 1in8b-mobile/v1:, как язык); на состояние игры, RNG и сохранения не влияет.
import { useSyncExternalStore } from 'react';

export type SoundKind = 'sound' | 'music';
const KEY: Record<SoundKind, string> = { sound: '1in8b-mobile/v1:mobile.sound', music: '1in8b-mobile/v1:mobile.music' };
const listeners = new Set<() => void>();
const cache: Partial<Record<SoundKind, boolean>> = {};

function read(kind: SoundKind): boolean {
  if (cache[kind] !== undefined) return cache[kind]!;
  let on = true;
  try { on = globalThis.localStorage?.getItem(KEY[kind]) !== 'off'; } catch { /* хранилище недоступно — по умолчанию включено */ }
  cache[kind] = on;
  return on;
}

export function setSound(kind: SoundKind, on: boolean) {
  cache[kind] = on;
  try { globalThis.localStorage?.setItem(KEY[kind], on ? 'on' : 'off'); } catch { /* выбор живёт до перезагрузки */ }
  listeners.forEach(l => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function useSound(kind: SoundKind): boolean {
  return useSyncExternalStore(subscribe, () => read(kind), () => true);
}
