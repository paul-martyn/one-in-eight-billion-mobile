// React-привязка к адаптеру. Экраны получают снимки и отправляют команды;
// к core они не обращаются (verify:core проверяет импорты).
import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { GameAdapter, type Snapshot } from './gameAdapter.ts';
import type { Top } from './commands';

const AdapterContext = createContext<GameAdapter | null>(null);

export function GameProvider({ adapter, children }: { adapter: GameAdapter; children: ReactNode }) {
  return <AdapterContext.Provider value={adapter}>{children}</AdapterContext.Provider>;
}

export function useAdapter(): GameAdapter {
  const a = useContext(AdapterContext);
  if (!a) throw new Error('GameProvider не найден');
  return a;
}

export function useSnapshot(): Snapshot {
  const a = useAdapter();
  return useSyncExternalStore(a.subscribe, a.getSnapshot, a.getSnapshot);
}

/** Доля текущего года (0–1), обновляется каждый кадр. */
export function useYearProgress(): number {
  const a = useAdapter();
  return useSyncExternalStore(a.subscribeProgress, a.getProgress, a.getProgress);
}

/**
 * Данные экрана, построенные функциями оригинала в песочнице (копия S,
 * отдельный RNG). Пересчитываются при новой версии снимка.
 * builder должен быть стабильной функцией модуля (src/adapters/vm/*).
 */
export function useCoreView<T>(builder: (top: Top) => T, ...deps: unknown[]): T | null {
  const a = useAdapter();
  const snap = useSnapshot();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => (snap.status === 'ready' ? a.view(builder) : null), [a, builder, snap.version, ...deps]);
}

/** Уникальный идентификатор жеста пользователя для однократного применения команды. */
let gesture = 0;
export function gestureId(): string {
  gesture += 1;
  return `g${Date.now().toString(36)}-${gesture}`;
}
