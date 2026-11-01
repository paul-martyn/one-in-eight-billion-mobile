// Выбор деталей для человека: randomPerson демо-генератора, где Math.random
// заменён детерминированным хэшем от seed (FNV-1a от seed и имени признака).
// Пол, возрастная группа и кожа приходят из игры (src/adapters/vm/appearance.ts).
// Каждый признак берёт своё число, поэтому цвет волос, форма головы и черты
// лица сохраняются, когда человек переходит в следующую возрастную группу.
//
// Отличия от генератора (черновые решения, будут пересмотрены):
// - головных уборов нет (у игры нет данных, чтобы назначать их без стереотипов);
// - только базовые пары обуви (mvp);
// - без трости и рюкзака: они сообщали бы факты (здоровье, школа), которых игра не говорила.
import type { PersonLook } from '../../adapters/vm/appearance';
import { hairColours, METALS, SHOECOLS } from './assemble.ts';
import type { Appearance, BodyDef, FaceGroup, Manifest } from './types';

const BODY = {
  toddler: { f: 'toddler', m: 'toddler' },
  child: { f: 'child_girl', m: 'child_boy' },
  teen: { f: 'teen_girl', m: 'teen_boy' },
  adult: { f: 'woman', m: 'man' },
  elder: { f: 'elder_woman', m: 'elder_man' },
} as const;

const STYLE_PICK: Record<string, (string | null)[]> = {
  f: ['adult_long_wavy', 'adult_long_bangs', 'adult_bob', 'adult_high_pony', 'adult_afro', 'adult_two_puffs', 'adult_twists', 'adult_long_straight', 'adult_low_pony', 'adult_low_bun', 'adult_high_bun', 'adult_wavy_medium'],
  m: ['adult_crew', 'adult_side_part', 'adult_quiff', 'adult_buzz', 'adult_messy_medium', 'adult_afro', 'adult_wavy_medium', 'adult_twists'],
  elder_f: ['adult_low_bun', 'adult_bob', 'adult_high_bun', 'adult_wavy_medium', 'adult_long_straight'],
  elder_m: ['adult_wreath', 'adult_bald', 'adult_side_part', 'adult_crew', 'adult_buzz'],
  child_f: ['child_pigtails', 'child_braids', 'child_bowl'],
  child_m: ['child_bowl', 'child_messy'],
  toddler: ['toddler_tuft', null],
};

function fnv1a(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h >>> 0;
}

function outfitsOf(bd: BodyDef): string[][] {
  const gs = bd.garments;
  const full = gs.filter(x => x.cut === 'FULL'), tops = gs.filter(x => x.cut === 'TOP'), bottoms = gs.filter(x => x.cut === 'BOTTOM');
  return [...full.map(f => [f.id]), ...tops.flatMap(t => bottoms.map(b => [b.id, t.id]))];
}

export function appearanceFor(look: PersonLook, M: Manifest): Appearance {
  const u = (trait: string) => fnv1a(look.seed + ':' + trait) / 4294967296;
  const idx = (trait: string, n: number) => Math.min(n - 1, Math.floor(u(trait) * n));
  const pickOf = <X>(trait: string, list: readonly X[]): X => list[idx(trait, list.length)]!;
  const chance = (trait: string, p: number) => u(trait) < p;
  const fabric = (trait: string) => idx(trait, M.fabrics.length);
  const tone = Math.max(0, Math.min(M.tones.length - 1, look.tone));

  if (look.band === 'baby') return { band: 'baby', tone, baby: pickOf('baby', M.babies).id, pal: fabric('pal') };

  const age = look.band, sex = look.sex;
  const B = BODY[age][sex];
  const bd = M.bodies[B];
  if (!bd) throw new Error(`Нет тела ${B}`);
  const kid = age === 'toddler' || age === 'child';
  const F = bd.face;
  const one = (g: FaceGroup) => { const list = F[g]; return list && list.length ? pickOf('face.' + g, list).id : undefined; };
  const face: Partial<Record<FaceGroup, string>> = {};
  const set = (g: FaceGroup, v: string | null | undefined) => { if (v) face[g] = v; };
  if (kid) {
    set('eyesChild', one('eyesChild'));
    set('noses', pickOf('face.noses.kid', ['noses2', 'noses3']));
    set('mouths', pickOf('face.mouths.kid', ['mouths1', 'mouths3', 'mouths7']));
    set('brows', age === 'child' ? pickOf('face.brows.kid', ['brows1', 'brows3']) : null);
    if (chance('face.details?', 0.2)) set('details', one('details'));
  } else {
    set('eyes', one('eyes'));
    set('brows', one('brows'));
    set('noses', one('noses'));
    set('mouths', one('mouths'));
    if (sex === 'm' && age !== 'teen' && chance('face.facial?', 0.5)) {
      if (chance('face.facialKind', 0.5)) set('moustaches', one('moustaches'));
      else set('beards', one('beards'));
    }
    if (age === 'elder') set('age', pickOf('face.age.elder', ['age2', 'age3']));
    else if (age === 'adult' && chance('face.age?', 0.3)) set('age', 'age1');
    if (chance('face.details?', 0.2)) set('details', one('details'));
  }

  const styles = age === 'toddler' ? STYLE_PICK.toddler! : age === 'child' ? STYLE_PICK['child_' + sex]! : age === 'elder' ? STYLE_PICK['elder_' + sex]! : STYLE_PICK[sex]!;
  const style = pickOf('style.' + (kid ? age : age === 'elder' ? 'elder' : 'adult') + '.' + sex, styles);
  const hair = age === 'elder' ? pickOf('hair.elder', [4, 5, 4]) : pickOf('hair', [0, 0, 1, 2, 3, 6, 7]);

  const shoes = bd.shoes.filter(x => x.mvp);
  const shoe = shoes.length ? pickOf('shoe', shoes).id : null;
  const has = (k: string) => bd.accessories.some(x => x.kind === k);
  const acc = ['watch', 'bracelets', 'chain', 'bag'].filter(k => has(k) && chance('acc.' + k, 0.22));
  const fa = (kind: string) => bd.faceAcc.filter(x => x.kind === kind);
  const glasses = fa('glasses').length && chance('glasses?', age === 'elder' ? 0.45 : age === 'adult' ? 0.22 : 0.1) ? pickOf('glasses', fa('glasses')).id : null;
  const earrings = fa('earrings').length && sex === 'f' && chance('earrings?', 0.4) ? pickOf('earrings', fa('earrings')).id : null;
  const outfits = outfitsOf(bd);

  return {
    band: age, sex, body: B, tone,
    head: pickOf('head', bd.heads).id,
    face,
    style: style && bd.styles.some(x => x.id === style) ? style : null,
    hair: Math.min(hair, hairColours(M).length - 1),
    headwear: null,
    hwPal: fabric('hwPal'),
    outfit: outfits.length ? pickOf('outfit', outfits) : [],
    pal: fabric('pal'),
    shoe,
    shoeCol: idx('shoeCol', SHOECOLS.length),
    acc,
    accPal: fabric('accPal'),
    metal: idx('metal', METALS.length),
    glasses,
    earrings,
  };
}
