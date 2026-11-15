// Люди дома во весь рост (сцена вкладки «Жизнь»), из генератора Peepulation. В сцене есть глубина
// (просьба 15 ноября 2026): кто ближе — крупнее, стоит ниже и перекрывает тех, кто позади; кто дальше — мельче
// и стоит чуть выше. Пока два плана: игрок всегда по центру кадра и впереди, остальные — позади него, слева и
// справа в порядке списка (первая половина слева, вторая справа), ближние к игроку перекрывают дальних.
// Айдл генератора идёт всегда (дыхание, моргание; в сокращённом режиме игры — нет). Если людей много, задний
// ряд встаёт теснее, а потом уменьшается весь кадр. Пока детали грузятся — fallback (инициал игрока).
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { PersonLook } from '../../adapters/vm/appearance';
import { useReducedMotion } from '../motionPrefs';
import { BODY_BOX, bodyOf } from '../peeps/peeps';
import { usePeepsReady } from './PersonArt';

export type HouseholdMemberView = { key: string; look: PersonLook | null; me: boolean };

/** Наибольший масштаб переднего плана (игрок): px макета на единицу генератора. */
const FRONT_K = 0.64;
/** Задний план относительно переднего: мельче на 12%. */
const BACK = 0.88;
/** Земля заднего плана выше на столько единиц переднего плана (около 10 px). */
const RAISE = 16;
/** Какая доля ширины головы соседа прячется за головой игрока. */
const PEEK = 0.3;
/** Головы соседей в заднем ряду заходят друг на друга на столько единиц (их масштаба); теснее всего — MAX. */
const HEAD_OVERLAP = 10;
const HEAD_OVERLAP_MAX = 30;
/** Масштаб, от которого считаются тени (на нём их ширина подобрана в макете). */
const SHADOW_K = 0.5;
/** Над головой игрока — значок: его высота с зазором, px макета. */
const BADGE_ROOM = 22;
/** Высота от низа рамки до верха головы, единиц генератора (верх головы — 14 + 164 · (1 − масштаб) от верха рамки). */
const tallOf = (scale: number) => BODY_BOX.h - 14 - 164 * (1 - scale);

type Body = ReturnType<typeof bodyOf>;
type Placed = { m: HouseholdMemberView; b: Body; x: number; s: number; lift: number; z: number };

/**
 * Одна сторона заднего ряда, от ближнего к игроку к дальнему: расстояния от центра кадра до центров голов
 * (в единицах переднего плана) и ширина стороны. o — нахлёст голов соседей.
 */
function side(heads: number[], meHalf: number, o: number) {
  const d: number[] = [];
  heads.forEach((h, j) => {
    d.push(j === 0 ? meHalf + h * BACK * (1 - 2 * PEEK) : d[j - 1]! + (heads[j - 1]! + h - o) * BACK);
  });
  const n = heads.length;
  return { d, extent: n ? d[n - 1]! + heads[n - 1]! * BACK : meHalf };
}

/** Нахлёст для стороны: наименьший, при котором сторона влезает в room при FRONT_K (не больше MAX). */
function overlapFor(heads: number[], meHalf: number, room: number) {
  const n = heads.length;
  if (n < 2 || room <= 0) return HEAD_OVERLAP;
  const extra = side(heads, meHalf, HEAD_OVERLAP).extent - room / FRONT_K;
  return Math.min(HEAD_OVERLAP_MAX, Math.max(HEAD_OVERLAP, HEAD_OVERLAP + extra / (BACK * (n - 1))));
}

/**
 * Раскладка: x — от центра кадра (единицы переднего плана), s — масштаб относительно переднего плана, lift —
 * подъём земли (единицы переднего плана), z — порядок перекрытия. k — px на единицу переднего плана.
 */
export function householdLayout(bodies: { m: HouseholdMemberView; b: Body }[], room: { left: number; right: number; h: number }) {
  const me = bodies.find(p => p.m.me)!;
  const others = bodies.filter(p => p !== me);
  const nL = Math.ceil(others.length / 2);
  const left = others.slice(0, nL).reverse(); // от ближнего к игроку
  const right = others.slice(nL);
  const meHalf = me.b.headHalf;
  const oL = overlapFor(left.map(p => p.b.headHalf), meHalf, room.left);
  const oR = overlapFor(right.map(p => p.b.headHalf), meHalf, room.right);
  const L = side(left.map(p => p.b.headHalf), meHalf, oL);
  const R = side(right.map(p => p.b.headHalf), meHalf, oR);

  let k = FRONT_K;
  if (room.left > 0) k = Math.min(k, room.left / L.extent);
  if (room.right > 0) k = Math.min(k, room.right / R.extent);
  if (room.h > 0) {
    k = Math.min(k, (room.h - BADGE_ROOM) / tallOf(me.b.scale));
    for (const p of others) k = Math.min(k, room.h / (tallOf(p.b.scale) * BACK + RAISE));
  }
  k = Math.max(0.2, k);

  const placed: Placed[] = [{ ...me, x: 0, s: 1, lift: 0, z: 20 }];
  left.forEach((p, j) => placed.push({ ...p, x: -L.d[j]!, s: BACK, lift: RAISE, z: 10 - j }));
  right.forEach((p, j) => placed.push({ ...p, x: R.d[j]!, s: BACK, lift: RAISE, z: 10 - j }));
  return { k, placed };
}

export function Household({ members, badge, label, fallback }: { members: HouseholdMemberView[]; badge: ReactNode; label: string; fallback: ReactNode }) {
  const ready = usePeepsReady();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  // Место под людей: от центра кадра (середина сцены) до краёв области .pa-home и её высота.
  const [room, setRoom] = useState({ c: 0, left: 0, right: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => {
      const parentW = (el.offsetParent as HTMLElement | null)?.clientWidth ?? el.clientWidth;
      const c = parentW / 2 - el.offsetLeft;
      const next = { c, left: c, right: el.clientWidth - c, h: el.clientHeight };
      setRoom(r => (r.c === next.c && r.right === next.right && r.h === next.h ? r : next));
    };
    read();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ready]);

  const shown = ready ? members.filter(m => m.look) : [];
  if (!ready || !shown.some(m => m.me)) return <>{fallback}</>;
  const { k, placed } = householdLayout(shown.map(m => ({ m, b: bodyOf(m.look!) })), room);
  return (
    <div ref={ref} className={`pa-home ${reduced ? '' : 'peeps-idle'}`}>
      {label ? <p className="sr-only">{label}</p> : null}
      {placed.map(({ m, b, x, s, lift, z }) => {
        const kp = k * s;
        return (
          <span
            key={m.key}
            className={`pa-home__p ${m.me ? 'pa-home__p--me' : ''}`}
            style={{ left: room.c + x * k - BODY_BOX.cx * kp, bottom: lift * k, width: BODY_BOX.w * kp, height: BODY_BOX.h * kp, zIndex: z }}
            aria-hidden="true"
          >
            <span className="pa-home__shadow" style={{ width: Math.max(18, 40 * b.scale) * (kp / SHADOW_K) }} />
            <span className="pa-home__body" dangerouslySetInnerHTML={{ __html: b.svg }} />
            {m.me ? <span className="pa-home__badge" style={{ top: (14 + 164 * (1 - b.scale) - 4) * kp }}>{badge}</span> : null}
          </span>
        );
      })}
    </div>
  );
}
