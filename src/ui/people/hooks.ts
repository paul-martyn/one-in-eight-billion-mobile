// Хуки людей: общие данные внешности из адаптера и состояние сборки.
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { Top } from '../../adapters/commands';
import type { GameAdapter } from '../../adapters/gameAdapter';
import { useAdapter, useSnapshot } from '../../adapters/useGame';
import type { PersonLook } from '../../adapters/vm/appearance';
import { figureState, figuresVersion, lookKey, requestFigure, subscribeFigures, type FigureState } from './store';

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

/** Состояния сборки для списка людей; недостающие ставятся в очередь после рендера. */
export function useFigures(looks: readonly (PersonLook | null | undefined)[]): (FigureState | undefined)[] {
  useSyncExternalStore(subscribeFigures, figuresVersion, figuresVersion);
  // Без списка зависимостей: после каждого рендера только проверка кэша (вытесненная фигура собирается снова).
  useEffect(() => {
    for (const l of looks) if (l && !figureState(lookKey(l))) requestFigure(l);
  });
  return looks.map(l => (l ? figureState(lookKey(l)) : undefined));
}

export function useFigure(look: PersonLook | null | undefined): FigureState | undefined {
  return useFigures([look])[0];
}
