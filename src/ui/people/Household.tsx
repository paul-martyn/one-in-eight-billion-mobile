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

/**
 * Наибольший масштаб: 0,6 px макета на единицу генератора (тело 94 × 109 при высоте сцены 255; 15 ноября 2026 —
 * крупнее и ниже, было 0,5). Меньше — если ряд не влезает в ширину или люди со значком над головой — в высоту.
 */
const PX_PER_UNIT = 0.6;
/** Масштаб, от которого считаются тени (на нём их ширина подобрана в макете). */
const SHADOW_K = 0.5;
/** Головы соседей заходят друг на друга на столько единиц генератора (5 px при масштабе 0,5). */
const HEAD_OVERLAP = 10;
/** Теснее всего: головы внахлёст на столько единиц (примерно четверть головы взрослого). */
const HEAD_OVERLAP_MAX = 30;
/** Над головой самого высокого — значок игрока: его высота с зазором, px макета. */
const BADGE_ROOM = 22;
/** Верх головы взрослого — 14 единиц от верха рамки. */
const HEAD_TOP = 14;

export function Household({ members, badge, label, fallback }: { members: HouseholdMemberView[]; badge: ReactNode; label: string; fallback: ReactNode }) {
  const ready = usePeepsReady();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const [room, setRoom] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setRoom(r => (r.w === el.clientWidth && r.h === el.clientHeight ? r : { w: el.clientWidth, h: el.clientHeight }));
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
  // Большая семья, которая не влезает в ширину при наибольшем масштабе, встаёт теснее (головы внахлёст до
  // HEAD_OVERLAP_MAX) — так люди меньше уменьшаются.
  const heads = bodies.reduce((s, { b }) => s + 2 * b.headHalf, 0);
  const gaps = Math.max(0, bodies.length - 1);
  const overlap = gaps && room.w > 0 ? Math.min(HEAD_OVERLAP_MAX, Math.max(HEAD_OVERLAP, (heads - room.w / PX_PER_UNIT) / gaps)) : HEAD_OVERLAP;
  const span = heads - overlap * gaps;
  // Высота: от верха головы самого высокого до низа рамки, плюс место для значка над головой.
  const tall = Math.max(...bodies.map(({ b }) => BODY_BOX.h - HEAD_TOP - 164 * (1 - b.scale)));
  let k = PX_PER_UNIT;
  if (room.w > 0) k = Math.min(k, room.w / span);
  if (room.h > 0) k = Math.min(k, Math.max(0.2, (room.h - BADGE_ROOM) / tall));
  const boxW = BODY_BOX.w * k, boxH = BODY_BOX.h * k;
  return (
    <div ref={ref} className={`pa-home ${reduced ? '' : 'peeps-idle'}`}>
      {label ? <p className="sr-only">{label}</p> : null}
      {bodies.map(({ m, b }, i) => {
        // Соседние рамки сдвигаются так, чтобы головы касались и заходили друг на друга на HEAD_OVERLAP.
        const prev = bodies[i - 1]?.b;
        const ml = prev ? -((BODY_BOX.cx - prev.headHalf) + (BODY_BOX.cx - b.headHalf) + overlap) * k : 0;
        return (
          <span key={m.key} className={`pa-home__p ${m.me ? 'pa-home__p--me' : ''}`} style={{ width: boxW, height: boxH, marginLeft: ml, zIndex: m.me ? 2 : 1 }} aria-hidden="true">
            <span className="pa-home__shadow" style={{ width: Math.max(18, 40 * b.scale) * (k / SHADOW_K) }} />
            <span className="pa-home__body" dangerouslySetInnerHTML={{ __html: b.svg }} />
            {/* Значок над головой: верх головы в рамке — 14 + 164 · (1 − масштаб) единиц от верха рамки. */}
            {m.me ? <span className="pa-home__badge" style={{ top: (14 + 164 * (1 - b.scale) - 4) * k }}>{badge}</span> : null}
          </span>
        );
      })}
    </div>
  );
}
