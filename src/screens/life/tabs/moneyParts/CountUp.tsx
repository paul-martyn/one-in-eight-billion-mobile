// Счёт суммы от нуля при входе на вкладку (motion.json → sequences.countUp:
// 900 мс, easeOutCubic; при сокращённом движении — сразу итог).
// Сумма уже отформатирована оригиналом (wonStr); анимация лишь проходит
// числовую часть строки, последний кадр — ровно исходная строка.
import { useEffect, useState } from 'react';
import spec from '../../../../design/motion.json';
import { useReducedMotion } from '../../../../ui/motionPrefs';
import { useAdapter } from '../../../../adapters/useGame';
import { scaleNumbers } from '../../../../i18n/numbers';

const easeOutCubic = (x: number) => 1 - (1 - x) ** 3;

/** Строка суммы со счётом при каждом входе (play: вкладка активна). */
export function CountUp({ text, play }: { text: string; play: boolean }) {
  const locale = useAdapter().formatLocale();
  const reduced = useReducedMotion();
  const [k, setK] = useState<number | null>(() => (play && !reduced ? 0 : null));
  useEffect(() => {
    if (!play || reduced) { setK(null); return; }
    const dur = spec.sequences.countUp.durationMs;
    const t0 = performance.now();
    let raf = 0;
    setK(0);
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      if (p >= 1) { setK(null); return; }
      setK(easeOutCubic(p));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [play, reduced]);
  const shown = k === null ? text : scaleNumbers(text, k, locale, true);
  return (
    <>
      <span aria-hidden="true">{shown}</span>
      <span className="sr-only">{text}</span>
    </>
  );
}
