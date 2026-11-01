// Появление раздела Odds: одно значение прогресса 0→1 за 900 мс (ease-out cubic),
// как в OddsLife.dc.html (enterP). От него зависят прорисовка кривых и счётчики.
// Только представление: игровое состояние не читает и не меняет.
import { useEffect, useState } from 'react';
import spec from '../../../../design/motion.json';
import { useReducedMotion } from '../../../../ui/motionPrefs';

const DURATION = spec.sequences.countUp.durationMs;
const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3);

/** Прогресс появления; при сокращённом движении сразу 1. Перезапуск — новым key у компонента. */
export function useEnterProgress(): number {
  const reduced = useReducedMotion();
  const [k, setK] = useState(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) { setK(1); return; }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - t0) / DURATION));
      setK(easeOutCubic(p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);
  return k;
}

/**
 * Счётчик внутри готовой строки оригинала: числа масштабируются на k, в конце
 * показывается исходная строка без изменений. Числа после слова с пробелом
 * («per 1,000») не трогаются — это единица измерения, а не значение.
 */
export function countText(s: string, k: number): string {
  if (k >= 1) return s;
  return s.replace(/(?<![\p{L}]\s)(?<![\d.,])\d[\d,]*(?:\.\d+)?/gu, m => {
    const dec = m.includes('.') ? (m.split('.')[1]?.length ?? 0) : 0;
    const v = Number(m.replace(/,/g, '')) * Math.max(0, k);
    return m.includes(',')
      ? v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })
      : v.toFixed(dec);
  });
}
