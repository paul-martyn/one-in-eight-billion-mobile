// Вспомогательные хуки экрана жизни. Только представление: состояние игры не читают и не меняют.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import spec from '../../../design/motion.json';
import { t } from '../../../i18n';
import { STAT_COLOR, type StatKey } from '../../../ui/components';

function subscribeVisibility(cb: () => void) {
  document.addEventListener('visibilitychange', cb);
  return () => document.removeEventListener('visibilitychange', cb);
}
/** Видима ли вкладка браузера. */
export function useDocumentVisible(): boolean {
  return useSyncExternalStore(subscribeVisibility, () => !document.hidden, () => true);
}

const COUNT_MS = spec.sequences.countUp.durationMs;
/**
 * Доля 0…1 входной анимации (motion.json sequences.countUp: 900 мс, ease-out cubic).
 * Играет один раз при появлении; при сокращённом движении или skipAtMount сразу 1.
 */
export function useCountUp(reduced: boolean, skipAtMount = false): number {
  const done = useRef(reduced || skipAtMount);
  const [k, setK] = useState(done.current ? 1 : 0);
  useEffect(() => {
    if (done.current || reduced) { done.current = true; setK(1); return; }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / COUNT_MS);
      setK(1 - (1 - p) ** 3);
      if (p < 1) raf = requestAnimationFrame(tick);
      else done.current = true;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);
  return k;
}

const STAT_LABEL: Record<StatKey, string> = { hl: 'stat.hl', h: 'stat.h', sm: 'stat.sm', so: 'stat.so' };
/** «+3 Health» / «−4 Knowledge» (минус U+2212, как в макете). */
export function fxText(k: StatKey, d: number): string {
  const delta = d > 0 ? `+${d}` : `−${Math.abs(d)}`;
  return t('life.fxChip', { delta, stat: t(STAT_LABEL[k]) });
}
export const fxColor = (k: StatKey) => STAT_COLOR[k];
