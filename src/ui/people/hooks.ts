// Хуки людей: общие данные внешности из адаптера.
import { useMemo } from 'react';
import type { Top } from '../../adapters/commands';
import type { GameAdapter } from '../../adapters/gameAdapter';
import { useAdapter, useSnapshot } from '../../adapters/useGame';

const shared = new WeakMap<GameAdapter, { version: number; results: Map<unknown, unknown> }>();

/**
 * Как useCoreView, но один расчёт builder на версию снимка для всех
 * компонентов: аватары в списках не копируют S каждый по отдельности.
 * builder — стабильная функция модуля (src/adapters/vm/appearance.ts).
 */
export function useSharedCoreView<T>(builder: (top: Top) => T): T | null {
  const a = useAdapter();
  const snap = useSnapshot();
  return useMemo(() => {
    if (snap.status !== 'ready') return null;
    let e = shared.get(a);
    if (!e || e.version !== snap.version) {
      e = { version: snap.version, results: new Map() };
      shared.set(a, e);
    }
    if (!e.results.has(builder)) e.results.set(builder, a.view(builder));
    return e.results.get(builder) as T | null;
  }, [a, builder, snap.status, snap.version]);
}
