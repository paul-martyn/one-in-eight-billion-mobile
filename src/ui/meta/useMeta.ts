// Часы мета-слоя для интерфейса: обратный отсчёт до следующей энергии и
// пересчёт энергии адаптером, когда отсчёт дошёл до нуля. Это таймеры
// представления: adapter.refreshMeta() — не игровая команда, она только
// начисляет восстановление по прошедшему времени (src/adapters/meta.ts).
import { useEffect, useState, useSyncExternalStore } from 'react';
import spec from '../../design/motion.json';
import { useAdapter } from '../../adapters/useGame';

const QUANTUM_MS = 250; // как перерисовка отсчёта в HubCute (каждые 250 мс)

// Общие часы для всех отсчётов: один интервал, пока есть подписчики.
let quantum = Math.floor(Date.now() / QUANTUM_MS);
const subs = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
function readQuantum(): number {
  return Math.floor(Date.now() / QUANTUM_MS);
}
function subscribeClock(cb: () => void) {
  subs.add(cb);
  quantum = readQuantum();
  if (subs.size === 1) {
    timer = setInterval(() => {
      const q = readQuantum();
      if (q === quantum) return;
      quantum = q;
      subs.forEach(f => f());
    }, QUANTUM_MS);
  }
  return () => {
    subs.delete(cb);
    if (subs.size === 0) clearInterval(timer);
  };
}
// Без подписчиков интервал стоит — значение берётся заново, чтобы первый кадр не был устаревшим.
const getQuantum = () => (subs.size > 0 ? quantum : (quantum = readQuantum()));

/** Секунды до момента at (epoch ms); null, если at нет. Обновляется 4 раза в секунду. */
export function useSecondsLeft(at: number | null): number | null {
  const q = useSyncExternalStore(subscribeClock, getQuantum, getQuantum);
  if (at == null) return null;
  return Math.max(0, Math.ceil((at - q * QUANTUM_MS) / 1000));
}

/** «18:24»; от часа — «1:05:09». */
export function fmtCountdown(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/**
 * Когда наступает nextRefillAt, просит адаптер пересчитать энергию.
 * Если момент не сдвинулся (часы устройства), повторяет раз в секунду.
 */
export function useMetaRefresh(nextRefillAt: number | null | undefined): void {
  const adapter = useAdapter();
  useEffect(() => {
    if (nextRefillAt == null) return;
    let id: ReturnType<typeof setTimeout>;
    const fire = () => {
      adapter.refreshMeta();
      if (adapter.getSnapshot().meta?.nextRefillAt === nextRefillAt) id = setTimeout(fire, 1000);
    };
    id = setTimeout(fire, Math.max(0, nextRefillAt - Date.now()) + 50);
    return () => clearTimeout(id);
  }, [adapter, nextRefillAt]);
}

const C = spec.sequences.countUp;
const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3);

/**
 * Доля «набегания» чисел при появлении экрана (motion.json countUp: 900 мс,
 * easeOutCubic). Только показ: значения уже в снимке. Reduced motion — сразу 1.
 */
export function useCountUpProgress(reduced: boolean): number {
  const [p, setP] = useState(0);
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const t0 = performance.now();
    const frame = (now: number) => {
      const k = Math.min(1, (now - t0) / C.durationMs);
      setP(k);
      if (k < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);
  return reduced ? 1 : easeOutCubic(p);
}

/**
 * Доля «досчёта» (easeOutCubic) за durationMs, начиная с нового runKey.
 * runKey null — 0. Только показ: итоговые значения уже в снимке.
 */
export function useTweenProgress(runKey: number | null, durationMs: number): number {
  const [st, setSt] = useState<{ key: number | null; p: number }>({ key: null, p: 0 });
  useEffect(() => {
    if (runKey == null) return;
    let raf = 0;
    const t0 = performance.now();
    const frame = (now: number) => {
      const k = durationMs > 0 ? Math.min(1, (now - t0) / durationMs) : 1;
      setSt({ key: runKey, p: k });
      if (k < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [runKey, durationMs]);
  return runKey != null && st.key === runKey ? easeOutCubic(st.p) : 0;
}
