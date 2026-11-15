// Люди игры из генератора персонажей Peepulation (копия общего модуля character-art/nemo-peeps/peepulation.js —
// src/vendor/peepulation, обновление: npm run peeps:sync). Только здесь игра обращается к генератору, и только к
// именам из шапки модуля, — генератор можно менять, не трогая экраны.
//
// Что берётся из игры (src/adapters/vm/appearance.ts → PersonLook): пол, годы, тон кожи, происхождение (группа
// внешности, страна, этническая группа), кровный родственник (на кого похож), статы игрока (лицо по счастью и
// здоровью), счастье в момент смерти. Остальное выбирает генератор.
//
// Случайность: генератор берёт Math.random; здесь на время каждого вызова подставляется свой ГСЧ от ключа человека
// (withRandom), отдельный для каждой возрастной группы. Поэтому один и тот же человек одинаков на всех экранах,
// взрослеет «тем же» и не зависит от порядка отрисовки. Игровой RNG не тратится, время не идёт.
import * as G from '../../vendor/peepulation/peepulation.js';
import type { PeepBand, PeepCharacter } from '../../vendor/peepulation/peepulation.js';
import rules from '../../vendor/peepulation/rules.json';
import type { PersonLook } from '../../adapters/vm/appearance';
import { fnv1a } from '../../adapters/vm/appearance';

// ------------------------------------------------------------ загрузка

type Status = 'idle' | 'loading' | 'ready' | 'error';
let status: Status = 'idle';
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

/** Загрузить детали и правила (один раз; детали — из public/peeps/parts, кэш браузера). */
export function loadPeeps(): void {
  if (status !== 'idle' || typeof document === 'undefined') return;
  status = 'loading';
  G.preload({ partsRoot: `${import.meta.env.BASE_URL}peeps/parts/`, rules: rules as Record<string, unknown>, cache: 'default' })
    .then(() => { status = G.V1 ? 'ready' : 'error'; }, () => { status = 'error'; })
    .finally(() => { if (status === 'ready') injectIdle(); emit(); });
}
export const peepsStatus = () => status;
export const subscribePeeps = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

// ------------------------------------------------------------ айдл

/**
 * Айдл генератора (ppCss: дыхание — торс тянется, голова и руки покачиваются; моргание): в генераторе он включается
 * атрибутом body[data-anim="idle"], здесь — классом .peeps-idle на контейнере людей. Системную настройку «уменьшить
 * движение» игра не учитывает (motionPrefs); сокращённый режим игры просто не ставит класс.
 */
function injectIdle(): void {
  if (document.getElementById('peeps-idle')) return;
  const css = G.ppCss().split('\n')
    .filter(l => !l.includes('data-anim="walk"]') && !/@keyframes pp-(step|swing)/.test(l) && !/prefers-reduced-motion/.test(l))
    .map(l => l.replace(/:is\(body\[data-anim="idle"\], body\[data-anim="walk"\]\)/g, '.peeps-idle').replace(/body\[data-anim="idle"\]/g, '.peeps-idle'))
    .join('\n');
  const el = document.createElement('style');
  el.id = 'peeps-idle';
  el.textContent = css + '\n.peeps-idle .peeps-still * { animation: none !important; }';
  document.head.appendChild(el);
}

// ------------------------------------------------------------ люди

/** mulberry32 — ГСЧ генератора от ключа (не игровой). */
function rngFor(key: string): () => number {
  let a = fnv1a(key) >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Возрастная группа генератора по годам (rules.json → ages): 0–1, 2–11, 12–17, 18–59, 60+. */
export function peepBand(years: number): PeepBand {
  return years < 2 ? 'baby' : years < 12 ? 'child' : years < 18 ? 'teen' : years < 60 ? 'adult' : 'elder';
}

const chars = new Map<string, PeepCharacter>();
const keyOf = (l: PersonLook) => l.id + '#' + l.seed;

/** Человек как таковой (без возраста): тот же для одного ключа во всей жизни. */
function character(look: PersonLook, depth = 0): PeepCharacter {
  const key = keyOf(look);
  const hit = chars.get(key);
  if (hit) return hit;
  const origin = G.originFromGame({ group: look.origin.group, iso: look.origin.iso, ethnic: look.origin.ethnic });
  const c = G.withRandom(rngFor(key + '|char'), () =>
    look.kin && depth < 4 ? G.relative(character(look.kin, depth + 1), { sex: look.sex }) : G.peepsCharacter(look.sex, origin));
  // Кожа — из игры (тон 0–5 движка = тоны генератора по порядку).
  c.skin = Math.max(0, Math.min(5, look.tone));
  if (chars.size > 400) chars.clear();
  chars.set(key, c);
  return c;
}

export type Face = 'alive' | 'dead';

/** Человек в своём возрасте и состоянии: возрастные черты, лицо по статам, лицо после смерти. */
function aged(look: PersonLook, face: Face): { x: PeepCharacter; band: PeepBand; c: PeepCharacter } {
  const c = character(look);
  const band = peepBand(look.years);
  const x = G.withRandom(rngFor(keyOf(look) + '|' + band), () => G.atAge(c, band));
  x.ageYears = look.years;
  if (look.state) x.state = look.state;
  if (face === 'dead') { x.dead = true; x.deathH = look.deathH ?? 50; }
  return { x, band, c };
}

const draw = (look: PersonLook, x: PeepCharacter, band: PeepBand) =>
  G.withRandom(rngFor(keyOf(look) + '|draw|' + band), () => (band === 'baby' ? G.babyContent(x) : G.peepsContent(x)));

const svgCache = new Map<string, string>();
const cached = (key: string, make: () => string) => {
  let s = svgCache.get(key);
  if (s == null) {
    s = make();
    if (svgCache.size > 300) svgCache.clear();
    svgCache.set(key, s);
  }
  return s;
};
const stateKey = (l: PersonLook) => (l.state ? `${l.state.h < 20 ? 0 : l.state.h < 40 ? 1 : l.state.h < 70 ? 2 : 3}${l.state.hl < 20 ? 0 : l.state.hl < 40 ? 1 : 2}` : '');

export type Body = {
  /** SVG во весь рост: рамка 157 × 182 единиц холста головы, ноги на линии земли (у всех на одной высоте). */
  svg: string;
  /** Масштаб человека (возраст × рост): для расстановки по ширине головы. */
  scale: number;
  /** Половина ширины головы с волосами, в единицах холста головы (для расстановки «головы касаются»). */
  headHalf: number;
};
/** Ширина и высота рамки тела в единицах холста головы; ноги — на 178 от верха (GROUND 164 + 14). */
export const BODY_BOX = { w: 157, h: 182, feet: 178, cx: 78.5 };

export function bodyOf(look: PersonLook, face: Face = 'alive'): Body {
  const { x, band, c } = aged(look, face);
  const s = G.AGES[band].scale * G.heightK(c, band);
  const svg = cached(`b|${keyOf(look)}|${look.years}|${stateKey(look)}|${face}|${face === 'dead' ? (look.deathH ?? 50) >= 40 : ''}`, () => {
    G.useScale(s);
    const content = draw(look, x, band);
    return `<svg viewBox="-6 -14 157 182" aria-hidden="true" focusable="false" overflow="visible"><g transform="translate(${(72.5 * (1 - s)).toFixed(3)} ${(G.GROUND * (1 - s)).toFixed(3)}) scale(${s.toFixed(5)})">${content}</g></svg>`;
  });
  // Голова со средними волосами — около 130 единиц в ширину у взрослого (у детей голова крупнее телу).
  return { svg, scale: s, headHalf: 65 * s * (G.AGES[band].head || 1) };
}

/**
 * Рамка портрета:
 *  - 'bust' — «по грудь», рамка генератора (FRAMES.portrait, 157 × 130); младенец — в пелёнке (157 × 150). Заполняет
 *    квадрат вызывающего как object-fit: cover: бока подрезаются, низ — грудь (People, итоги, хаб, окно смерти);
 *  - 'square', 'circle' — человек целиком внутри рамки, с воздухом: в круге шире, чтобы волосы и ботинки не упирались
 *    в окружность; у детей квадрат шире (голова крупнее); младенец меньше, с воздухом вокруг пелёнки (свидетельство,
 *    «Your start in life»: обрезанные по груди родители и слишком крупный малыш смотрелись странно — решение 2026-11-15).
 */
export type Frame = 'bust' | 'square' | 'circle';
const FIT = {
  square: { x: -15, y: -9, w: 176, h: 176 }, squareKid: { x: -31, y: -30, w: 210, h: 210 },
  circle: { x: -35.5, y: -28, w: 216, h: 216 }, baby: { x: -42.5, y: -20, w: 230, h: 230 },
};
export function portraitOf(look: PersonLook, face: Face = 'alive', frame: Frame = 'bust'): string {
  const { x, band } = aged(look, face);
  return cached(`p|${frame}|${keyOf(look)}|${look.years}|${stateKey(look)}|${face}|${face === 'dead' ? (look.deathH ?? 50) >= 40 : ''}`, () => {
    G.useScale(1);
    const content = draw(look, x, band);
    const f = frame === 'bust' ? (band === 'baby' ? { x: -6, y: 20, w: 157, h: 150 } : G.FRAMES.portrait)
      : band === 'baby' ? FIT.baby : frame === 'circle' ? FIT.circle : band === 'child' ? FIT.squareKid : FIT.square;
    return `<svg viewBox="${f.x} ${f.y} ${f.w} ${f.h}" preserveAspectRatio="xMidYMid ${frame === 'bust' ? 'slice' : 'meet'}" aria-hidden="true" focusable="false">${content}</svg>`;
  });
}
