// Подгонка кегля под поле, как Auto Size у TextMeshPro: у поля есть ширина,
// наибольший и наименьший кегль; слово измеряется настоящим шрифтом и ставится
// наибольшим кеглем, при котором помещается. После загрузки шрифтов — заново.
import { useEffect, useState } from 'react';

const FONT = "Fredoka, Rubik, 'Baloo 2', system-ui, sans-serif";
const cache = new Map<string, number>();
let ctx: CanvasRenderingContext2D | null = null;
let epoch = 0;

/** Ширина текста при кегле 100 (без шрифта в окружении — оценка по числу знаков). */
function width100(text: string, weight: number): number {
  const key = `${epoch}|${weight}|${text}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  let w = 0;
  try {
    if (typeof document !== 'undefined') {
      ctx ??= document.createElement('canvas').getContext('2d');
      if (ctx) { ctx.font = `${weight} 100px ${FONT}`; w = ctx.measureText(text).width; }
    }
  } catch { w = 0; }
  if (!w) w = [...text].length * 58;
  cache.set(key, w);
  return w;
}

export type Field = readonly [width: number, max: number, min: number];

/** Наибольший кегль (с шагом 0,5), при котором текст помещается в поле. */
export function fitSize(text: string, [width, max, min]: Field, weight = 700): number {
  const w = width100(text, weight);
  return Math.max(min, Math.min(max, Math.floor((width / w) * 100 * 2) / 2));
}

/** Один кегль для нескольких строк: тот, при котором помещается самая длинная. */
export function fitAll(texts: string[], field: Field, weight = 700): number {
  return Math.min(...texts.map(text => fitSize(text, field, weight)));
}

/** Перерисовать после загрузки шрифтов: замеры до неё сделаны запасным шрифтом. */
export function useFontsReady(): number {
  const [n, setN] = useState(epoch);
  useEffect(() => {
    const fonts = typeof document !== 'undefined' ? document.fonts : null;
    if (!fonts) return;
    let alive = true;
    const bump = () => { if (!alive) return; epoch += 1; cache.clear(); setN(epoch); };
    void fonts.ready.then(bump);
    fonts.addEventListener?.('loadingdone', bump);
    return () => { alive = false; fonts.removeEventListener?.('loadingdone', bump); };
  }, []);
  return n;
}

/** Число и кегль счётчика: цифры ≈ 0,64 em, разделители ≈ 0,3 em. */
export function fitCount(text: string, [width, max, min]: Field): number {
  const digits = text.replace(/\D/g, '').length;
  const ems = digits * 0.64 + (text.length - digits) * 0.3;
  return Math.max(min, Math.min(max, Math.floor((width / Math.max(ems, 0.64)) * 2) / 2));
}
