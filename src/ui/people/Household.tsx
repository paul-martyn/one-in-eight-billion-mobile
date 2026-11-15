// Люди дома во весь рост на одной линии земли (сцена вкладки «Жизнь»), из генератора Peepulation.
// Как на холсте (LiveCute v354): все в одном масштабе генератора — дети ниже взрослых, — стоят одной группой,
// головы заходят друг на друга на 5 px (при масштабе макета), игрок впереди. Айдл генератора идёт всегда
// (дыхание, моргание; в сокращённом режиме игры — нет). Если людей много, масштаб уменьшается, чтобы ряд
// помещался в ширину. Пока детали грузятся — fallback (инициал игрока).
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { PersonLook } from '../../adapters/vm/appearance';
import { useReducedMotion } from '../motionPrefs';
import { BODY_BOX, bodyOf } from '../peeps/peeps';
import { usePeepsReady } from './PersonArt';

export type HouseholdMemberView = { key: string; look: PersonLook | null; me: boolean };

/** Масштаб макета: 0,5 px на единицу холста головы (тело 78,5 × 91 при высоте сцены 255). */
const PX_PER_UNIT = 0.5;
/** Головы соседей заходят друг на друга на столько px макета. */
const HEAD_OVERLAP = 5;

export function Household({ members, badge, label, fallback }: { members: HouseholdMemberView[]; badge: ReactNode; label: string; fallback: ReactNode }) {
  const ready = usePeepsReady();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setWidth(w => (w === el.clientWidth ? w : el.clientWidth));
    read();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ready]);

  const shown = ready ? members.filter(m => m.look) : [];
  if (!ready || !shown.some(m => m.me)) return <>{fallback}</>;
  const bodies = shown.map(m => ({ m, b: bodyOf(m.look!) }));
  // Ширина ряда: от левого края головы первого до правого края головы последнего, соседи — головами внахлёст.
  const span = bodies.reduce((s, { b }) => s + 2 * b.headHalf, 0) - (HEAD_OVERLAP / PX_PER_UNIT) * Math.max(0, bodies.length - 1);
  const k = width > 0 ? Math.min(PX_PER_UNIT, width / span) : PX_PER_UNIT;
  const boxW = BODY_BOX.w * k, boxH = BODY_BOX.h * k;
  return (
    <div ref={ref} className={`pa-home ${reduced ? '' : 'peeps-idle'}`}>
      {label ? <p className="sr-only">{label}</p> : null}
      {bodies.map(({ m, b }, i) => {
        // Соседние рамки сдвигаются так, чтобы головы касались и заходили друг на друга на HEAD_OVERLAP.
        const prev = bodies[i - 1]?.b;
        const ml = prev ? -((BODY_BOX.cx - prev.headHalf) + (BODY_BOX.cx - b.headHalf)) * k - HEAD_OVERLAP * (k / PX_PER_UNIT) : 0;
        return (
          <span key={m.key} className={`pa-home__p ${m.me ? 'pa-home__p--me' : ''}`} style={{ width: boxW, height: boxH, marginLeft: ml, zIndex: m.me ? 2 : 1 }} aria-hidden="true">
            <span className="pa-home__shadow" style={{ width: Math.max(18, 40 * b.scale) * (k / PX_PER_UNIT) }} />
            <span className="pa-home__body" dangerouslySetInnerHTML={{ __html: b.svg }} />
            {/* Значок над головой: верх головы в рамке — 14 + 164 · (1 − масштаб) единиц от верха рамки. */}
            {m.me ? <span className="pa-home__badge" style={{ top: (14 + 164 * (1 - b.scale) - 4) * k }}>{badge}</span> : null}
          </span>
        );
      })}
    </div>
  );
}
