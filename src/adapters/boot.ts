// Загрузка core в браузере. Вынесено в адаптер, чтобы UI не импортировал src/core.
import { bootCore, type CoreHost } from '../core/runtime.ts';

function browserStorage() {
  try {
    const s = window.localStorage;
    const probe = '1in8b-mobile/probe';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    // Приватный режим или запрет хранилища: жизнь идёт, но не сохраняется.
    return null;
  }
}

export function bootGameCore(): Promise<CoreHost> {
  // Начальное состояние потока, если сохранённого нет. Новая установка — новая строка.
  const seed = `web-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
  return bootCore({ storage: browserStorage(), seed });
}
