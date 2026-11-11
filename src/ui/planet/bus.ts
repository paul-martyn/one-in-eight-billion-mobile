// Шина планеты: одна на приложение. Планета считает на ней свои вспышки
// (рождения и смерти) и сообщает события; экраны слушают её и читают счётчики.
// Только представление: игровое состояние здесь не хранится.
import { useEffect, useRef, useState } from 'react';
import type { PlanetBus } from './planetCore.js';

export function makePlanetBus(): PlanetBus {
  const listeners: ((type: string, payload: unknown) => void)[] = [];
  return {
    born: 0, died: 0, coins: 0, gems: 0,
    on(fn) {
      listeners.push(fn);
      return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); };
    },
    emit(type, payload) { listeners.slice().forEach(fn => fn(type, payload)); },
  };
}

/** Планета одна на все экраны до жизни, поэтому и шина одна. */
export const planetBus = makePlanetBus();

/** Рождения и смерти, показанные планетой с открытия игры (обновление каждые stepMs). */
export function usePlanetCounts(stepMs = 250): { born: number; died: number } {
  const [counts, setCounts] = useState({ born: planetBus.born, died: planetBus.died });
  useEffect(() => {
    const read = () => setCounts(c => (c.born === planetBus.born && c.died === planetBus.died ? c : { born: planetBus.born, died: planetBus.died }));
    read();
    const id = setInterval(read, stepMs);
    return () => clearInterval(id);
  }, [stepMs]);
  return counts;
}

/** Подписка на события планеты (pick, land, dive, catch, roll, hurry…). */
export function usePlanetEvents(handler: (type: string, payload: unknown) => void, enabled = true): void {
  const latest = useRef(handler);
  latest.current = handler;
  useEffect(() => {
    if (!enabled) return;
    return planetBus.on((type, payload) => latest.current(type, payload));
  }, [enabled]);
}
