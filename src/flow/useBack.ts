import { useEffect, useRef } from 'react';
import { backStack, type BackHandler, type BackLayer } from './back';

/**
 * Регистрирует обработчик «Назад» (Esc) на время, пока enabled. Обработчик всегда
 * последний (ref), регистрация не пересоздаётся на каждом рендере.
 */
export function useBack(handler: BackHandler, { layer = 'screen', enabled = true }: { layer?: BackLayer; enabled?: boolean } = {}) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!enabled) return;
    return backStack.add(layer, () => ref.current());
  }, [layer, enabled]);
}

/** Слушатель клавиатуры: Esc → backStack. Ставится один раз в корне flow. */
export function useBackKey() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.repeat || e.isComposing || e.defaultPrevented) return;
      if (backStack.handle()) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
