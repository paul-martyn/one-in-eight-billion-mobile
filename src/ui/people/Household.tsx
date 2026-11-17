// Люди дома во весь рост (сцена вкладки «Жизнь»), из генератора Peepulation. В сцене есть глубина
// (просьба 15 ноября 2026): кто ближе — крупнее, стоит ниже и перекрывает тех, кто позади; кто дальше — мельче
// и стоит чуть выше. Семья стоит клином (17 ноября 2026): игрок всегда по центру кадра и впереди; за ним второй
// план — братья и сёстры (и все, кто не родители), слева и справа в порядке списка (первая половина слева, вторая
// справа; если справа места меньше — больше слева); родители — на дальнем плане, по краям: за крайними братьями и
// сёстрами, один слева, другой справа.
// Ближние перекрывают дальних. Если родителей дома нет или нет никого, кроме родителей, планов два, как раньше.
// Айдл генератора идёт всегда (дыхание, моргание; в сокращённом режиме игры — нет). Если людей много, ряды встают
// теснее, а потом уменьшается весь кадр. Пока детали грузятся — fallback (инициал игрока).
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { PersonLook } from '../../adapters/vm/appearance';
import { useReducedMotion } from '../motionPrefs';
import { BODY_BOX, bodyOf, peepBand } from '../peeps/peeps';
import type { PeepBand } from '../../vendor/peepulation/peepulation.js';
import { usePeepsReady } from './PersonArt';

/** far — дальний план (родители). */
export type HouseholdMemberView = { key: string; look: PersonLook | null; me: boolean; far?: boolean };

/** Наибольший масштаб переднего плана (игрок): px макета на единицу генератора. */
const FRONT_K = 0.64;
/** Второй план относительно переднего: мельче на 12%. */
const BACK = 0.88;
/** Земля второго плана выше на столько единиц переднего плана (около 10 px). */
const RAISE = 16;
/** Дальний план (родители) относительно второго: ещё мельче на 10% и стоит выше ещё на 12 единиц (около 7 px). */
const FAR = 0.9;
const RAISE_FAR = 12;
/** Планы позади игрока: масштаб относительно переднего, подъём земли (единицы переднего плана), порядок перекрытия. */
const LAYERS = [
  { s: BACK, lift: RAISE, z: 20 },
  { s: BACK * FAR, lift: RAISE + RAISE_FAR, z: 10 },
] as const;
/** Какая доля ширины головы соседа прячется за головой игрока. */
const PEEK = 0.3;
/** Головы соседей в заднем ряду заходят друг на друга на столько единиц (их масштаба); теснее всего — MAX. */
const HEAD_OVERLAP = 10;
const HEAD_OVERLAP_MAX = 30;
/** Масштаб, от которого считаются тени (на нём их ширина подобрана в макете). */
const SHADOW_K = 0.5;
/** Над головой игрока — значок: его высота с зазором, px макета. */
const BADGE_ROOM = 22;
/**
 * Где низ значка относительно верха холста головы (14 + 164 · (1 − масштаб) от верха рамки), в единицах генератора:
 * 17.11 — ниже, ближе к голове (было −4). BADGE_BAND — поправка возраста в единицах холста головы (× масштаб): у
 * младенца голова в холсте ниже, без поправки значок висел над ним высоко.
 */
const BADGE_DROP = 1;
const BADGE_BAND: Partial<Record<PeepBand, number>> = { baby: 24 };
/** Высота от низа рамки до верха головы, единиц генератора (верх головы — 14 + 164 · (1 − масштаб) от верха рамки). */
const tallOf = (scale: number) => BODY_BOX.h - 14 - 164 * (1 - scale);

type Body = ReturnType<typeof bodyOf>;
type Person = { m: HouseholdMemberView; b: Body };
type Placed = Person & { x: number; s: number; lift: number; z: number };
/** Человек на стороне клина: половина ширины головы (единицы генератора), план (0 — второй, 1 — дальний) и его масштаб. */
type Slot = Person & { h: number; layer: 0 | 1; s: number };

/**
 * Одна сторона клина, от ближнего к игроку к дальнему: расстояния от центра кадра до центров голов (в единицах
 * переднего плана) и ширина стороны. Первый выглядывает из-за головы игрока (PEEK), соседи на одном плане заходят
 * друг на друга на o (в единицах своего плана), а кто на плане дальше — выглядывает из-за крайнего ближнего (PEEK).
 */
function side(slots: Slot[], meHalf: number, o: number) {
  const d: number[] = [];
  slots.forEach((p, j) => {
    const q = slots[j - 1];
    d.push(!q ? meHalf + p.h * p.s * (1 - 2 * PEEK)
      : q.layer === p.layer ? d[j - 1]! + (q.h + p.h - o) * p.s
      : d[j - 1]! + q.h * q.s + p.h * p.s * (1 - 2 * PEEK));
  });
  const n = slots.length;
  return { d, extent: n ? d[n - 1]! + slots[n - 1]!.h * slots[n - 1]!.s : meHalf };
}

/** Нахлёст для стороны: наименьший, при котором сторона влезает в room при FRONT_K (не больше MAX). */
function overlapFor(slots: Slot[], meHalf: number, room: number) {
  // На сколько единиц переднего плана сдвигается сторона, если нахлёст соседей на одном плане растёт на 1.
  let per = 0;
  for (let j = 1; j < slots.length; j++) if (slots[j]!.layer === slots[j - 1]!.layer) per += slots[j]!.s;
  if (!per || room <= 0) return HEAD_OVERLAP;
  const extra = side(slots, meHalf, HEAD_OVERLAP).extent - room / FRONT_K;
  return Math.min(HEAD_OVERLAP_MAX, Math.max(HEAD_OVERLAP, HEAD_OVERLAP + extra / per));
}

/**
 * Раскладка: x — от центра кадра (единицы переднего плана), s — масштаб относительно переднего плана, lift —
 * подъём земли (единицы переднего плана), z — порядок перекрытия. k — px на единицу переднего плана.
 */
export function householdLayout(bodies: Person[], room: { left: number; right: number; h: number }) {
  const me = bodies.find(p => p.m.me)!;
  const others = bodies.filter(p => p !== me);
  // Второй план — все, кроме родителей; если, кроме родителей, никого нет — родители встают вторым планом.
  let near = others.filter(p => !p.m.far);
  let far = others.filter(p => p.m.far);
  if (!near.length) [near, far] = [far, []];
  const slot = (p: Person, layer: 0 | 1): Slot => ({ ...p, h: p.b.headHalf, layer, s: LAYERS[layer].s });
  // Второй план делится по месту сторон: при равном месте — пополам (лишний слева), а когда справа места меньше (там
  // кнопки времени, 17.11) — больше людей встаёт слева, чтобы кадр не мельчал из-за одной стороны.
  const wL = room.left > 0 && room.right > 0 ? room.left / (room.left + room.right) : 0.5;
  const nL = Math.min(near.length, Math.round(near.length * wL));
  const left = near.slice(0, nL).reverse().map(p => slot(p, 0)); // от ближнего к игроку
  const right = near.slice(nL).map(p => slot(p, 0));
  // Родители — по краям, по одному на сторону: первый — туда, где меньше людей (при равенстве — слева), дальше поочерёдно.
  let toLeft = left.length <= right.length;
  for (const p of far) { (toLeft ? left : right).push(slot(p, 1)); toLeft = !toLeft; }
  const meHalf = me.b.headHalf;
  const L = side(left, meHalf, overlapFor(left, meHalf, room.left));
  const R = side(right, meHalf, overlapFor(right, meHalf, room.right));

  let k = FRONT_K;
  if (room.left > 0) k = Math.min(k, room.left / L.extent);
  if (room.right > 0) k = Math.min(k, room.right / R.extent);
  if (room.h > 0) {
    k = Math.min(k, (room.h - BADGE_ROOM) / tallOf(me.b.scale));
    for (const p of [...left, ...right]) k = Math.min(k, room.h / (tallOf(p.b.scale) * p.s + LAYERS[p.layer].lift));
  }
  k = Math.max(0.2, k);

  const placed: Placed[] = [{ ...me, x: 0, s: 1, lift: 0, z: 30 }];
  const put = (list: Slot[], d: number[], sign: 1 | -1) => list.forEach(({ m, b, layer, s }, j) => {
    placed.push({ m, b, x: sign * d[j]!, s, lift: LAYERS[layer].lift, z: LAYERS[layer].z - j });
  });
  put(left, L.d, -1);
  put(right, R.d, 1);
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
            {m.me ? <span className="pa-home__badge" style={{ top: (14 + 164 * (1 - b.scale) + BADGE_DROP + (BADGE_BAND[peepBand(m.look!.years)] ?? 0) * b.scale) * kp }}>{badge}</span> : null}
          </span>
        );
      })}
    </div>
  );
}
