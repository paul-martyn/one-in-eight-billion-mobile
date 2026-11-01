// Счёт суммы от нуля при входе на вкладку (motion.json → sequences.countUp:
// 900 мс, easeOutCubic; при сокращённом движении — сразу итог).
// Сумма уже отформатирована оригиналом (wonStr); анимация лишь проходит
// числовую часть строки, последний кадр — ровно исходная строка.
import { useEffect, useState } from 'react';
import spec from '../../../../design/motion.json';
import { useReducedMotion } from '../../../../ui/motionPrefs';

type Parsed = { pre: string; value: number; decimals: number; grouped: boolean; post: string };

function parse(text: string): Parsed | null {
  const m = /^([^\d]*?)(\d[\d,]*(?:\.\d+)?)(.*)$/s.exec(text);
  if (!m) return null;
  const num = m[2]!;
  const value = Number(num.replace(/,/g, ''));
  if (!Number.isFinite(value) || value === 0) return null;
  return { pre: m[1]!, value, decimals: (num.split('.')[1] ?? '').length, grouped: num.includes(','), post: m[3]! };
}

function format(p: Parsed, k: number): string {
  const v = p.value * k;
  const s = p.grouped
    ? v.toLocaleString('en-US', { minimumFractionDigits: p.decimals, maximumFractionDigits: p.decimals })
    : v.toFixed(p.decimals);
  return p.pre + s + p.post;
}

const easeOutCubic = (x: number) => 1 - (1 - x) ** 3;

/** Строка суммы со счётом при каждом входе (play: вкладка активна). */
export function CountUp({ text, play }: { text: string; play: boolean }) {
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
  const parsed = k === null ? null : parse(text);
  const shown = k === null || !parsed ? text : format(parsed, k);
  return (
    <>
      <span aria-hidden="true">{shown}</span>
      <span className="sr-only">{text}</span>
    </>
  );
}
