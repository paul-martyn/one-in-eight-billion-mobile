// Люди дома во весь рост на одной линии земли (сцена вкладки «Жизнь»).
// Все в одном масштабе генератора: дети ниже взрослых. Если людей много,
// масштаб уменьшается, чтобы ряд помещался в ширину без прокрутки.
// Пока фигура игрока не собрана (детали грузятся, ошибка) — fallback.
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { PersonLook } from '../../adapters/vm/appearance';
import { useFigures } from './hooks';
import { FigureView } from './PersonArt';
import type { Figure } from './store';

export type HouseholdMemberView = { key: string; look: PersonLook | null; me: boolean };

/** Доля высоты холста, на которую соседи заходят друг за друга. */
const OVERLAP = 0.05;

export function Household({ members, badge, label, fallback }: { members: HouseholdMemberView[]; badge: ReactNode; label: string; fallback: ReactNode }) {
  const states = useFigures(members.map(m => m.look));
  const meIndex = members.findIndex(m => m.me);
  const ready = meIndex >= 0 && states[meIndex]?.status === 'ready';
  const ref = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setBox(b => (b && b.w === el.clientWidth && b.h === el.clientHeight ? b : { w: el.clientWidth, h: el.clientHeight }));
    read();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ready]);

  if (!ready) return <>{fallback}</>;
  const shown: { m: HouseholdMemberView; fig: Figure }[] = [];
  members.forEach((m, i) => {
    const st = states[i];
    if (st?.status === 'ready') shown.push({ m, fig: st.fig });
  });
  const H = box?.h ?? 0;
  const units = shown.reduce((s, x) => s + x.fig.canvas.width / x.fig.fullH, 0) - OVERLAP * Math.max(0, shown.length - 1);
  const k = box && units > 0 && H > 0 ? Math.min(1, box.w / (units * H)) : 1;
  const h = H * k;
  return (
    <div ref={ref} className="pa-home">
      {label ? <p className="sr-only">{label}</p> : null}
      {shown.map(({ m, fig }, i) => (
        <span key={m.key} className={`pa-home__p ${m.me ? 'pa-home__p--me' : ''}`} style={i ? { marginLeft: -OVERLAP * h } : undefined} aria-hidden="true">
          <span className="pa-home__shadow" />
          {h > 0 ? <FigureView fig={fig} height={h} /> : null}
          {m.me ? badge : null}
        </span>
      ))}
    </div>
  );
}
