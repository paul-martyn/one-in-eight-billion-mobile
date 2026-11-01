// Внешность людей для генератора персонажей (src/ui/people). Только чтение в
// песочнице useCoreView: функции оригинала вызываются на копии S.
//
// Из игры берутся только факты: пол, возраст и оттенок кожи. Оттенок — шкала
// оригинала sk0–sk5 (skinMe/skinPar/skinOfP/skinOfKid/skinHere, game.en.js
// 153947-154052); шесть тонов генератора совпадают с ней по порядку (sk0 #F2CDB0
// ≈ тон 0 #F3CFAE … sk5 #5E3A25 ≈ тон 5 #5E3B26). Всё остальное (голова, черты
// лица, причёска, одежда) выбирает интерфейс по `seed` — FNV-1a от стабильного
// ключа человека, поэтому один и тот же человек выглядит одинаково на всех
// экранах и взрослеет «тем же». Игровой RNG здесь не расходуется.
//
// Логика генерации пока черновая и будет пересмотрена: головных уборов нет,
// выбор деталей — равномерный по хэшу (src/ui/people/pick.ts).
import type { Top } from '../commands';

export type AgeBand = 'baby' | 'toddler' | 'child' | 'teen' | 'adult' | 'elder';
type Sex = 'f' | 'm';

export type PersonLook = {
  /** Стабильный ключ человека в этой жизни (роль + имя или разница в возрасте). */
  id: string;
  band: AgeBand;
  sex: Sex;
  /** Оттенок кожи 0–5 (sk0–sk5 оригинала = тоны генератора). */
  tone: number;
  /** Тон из функции оригинала или из хэша (у человека в игре нет кожи). */
  toneFrom: 'game' | 'hash';
  /** FNV-1a от ключа жизни и id: выбор всех остальных деталей. */
  seed: number;
};

/** Возрастные группы деталей (TZ-character-art: малыш 1–3, ребёнок 4–11, подросток 12–17, взрослый 18–59, пожилой 60+). */
export function ageBand(age: number): AgeBand {
  if (age < 1) return 'baby';
  if (age < 4) return 'toddler';
  if (age < 12) return 'child';
  if (age < 18) return 'teen';
  if (age < 60) return 'adult';
  return 'elder';
}

export function fnv1a(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h >>> 0;
}

type Any = Record<string, any>;

const sexOf = (s: unknown): Sex | null => (s === 'F' ? 'f' : s === 'M' ? 'm' : null);
const fullName = (m: Any | null | undefined): string => (m && m.name && typeof m.name === 'object' ? String(m.name.full ?? '') : '');

/** Ключ жизни: имя и страна рождения (skinSeed оригинала, 153980). */
function lifeKey(T: Top): string {
  const S = T.S as Any;
  try {
    if (typeof T.skinSeed === 'function') return String(T.skinSeed());
  } catch { /* ниже — запасной ключ */ }
  return fullName(S) + String(S.born ?? '');
}

function make(life: string, id: string, age: unknown, sex: unknown, tone: unknown): PersonLook | null {
  const sx = sexOf(sex);
  if (!sx || typeof age !== 'number' || !Number.isFinite(age) || age < 0) return null;
  const seed = fnv1a(life + '|' + id);
  const game = typeof tone === 'number' && Number.isInteger(tone) && tone >= 0 && tone <= 5;
  return {
    id, band: ageBand(age), sex: sx,
    tone: game ? (tone as number) : fnv1a(life + '|' + id + '|tone') % 6,
    toneFrom: game ? 'game' : 'hash',
    seed,
  };
}

/**
 * Оригинал запоминает кожу партнёра (partner.skn) при первой отрисовке сцены;
 * до этого skinOfP берёт возраст партнёра в ключ, и тон менялся бы каждый год.
 * Здесь (на копии S в песочнице) тон фиксируется так, как его запомнил бы
 * оригинал в год, когда партнёр появился в доме: возраст на момент брака.
 * От этого же значения зависит skinOfKid.
 */
function primeSkins(T: Top): void {
  const S = T.S as Any;
  const fam = S.fam as Any | undefined;
  if (!fam || typeof T.skinOfP !== 'function') return;
  const p = fam.partner as Any | null;
  if (p && p.skn == null) {
    const joined = typeof fam.marriedAt === 'number' && typeof p.age === 'number' ? p.age - (S.age - fam.marriedAt) : 0;
    p.skn = T.skinOfP({ ...p, age: joined });
  }
  for (const m of [fam.wife2, fam.co] as (Any | null | undefined)[]) {
    if (m && m.skn == null) m.skn = T.skinOfP({ ...m, age: 0 });
  }
}

/** Тон братьев и сестёр — как в sceneModel (154143): при переезде после усыновления skinPar, иначе skinMe. */
const sibTone = (T: Top, sex: unknown) => {
  const S = T.S as Any;
  return S.adopt && S.adopt.mv != null ? T.skinPar(sex) : T.skinMe();
};

const kidKey = (m: Any) => 'kid|' + (fullName(m) || 'b' + String(m.bornAt)) + '|' + String(m.sex);
const sibKey = (d: number, sex: unknown) => 'sib|' + d + '|' + String(sex);

// ---------------------------------------------------------------- сцена

export type HouseholdRole = 'me' | 'par' | 'sib' | 'pt' | 'kid' | 'grandkid' | 'inlaw';
export type HouseholdMember = { role: HouseholdRole; age: number; sex: 'F' | 'M'; look: PersonLook | null };

/**
 * Кто сейчас дома — sceneModel().people оригинала (154054-154243): роль, возраст,
 * пол и кожа, порядок как в оригинале. Ключ человека находится по его записи в
 * S.fam (родитель по полю w/полу, партнёр по порядку homeOthers, ребёнок и
 * внук по году рождения и полу, брат или сестра по разнице в возрасте).
 */
export function householdAppearances(T: Top): HouseholdMember[] | null {
  const S = T.S as Any;
  if (!S || !S.fam || typeof T.sceneModel !== 'function') return null;
  primeSkins(T);
  const model = T.sceneModel() as Any;
  const people = (Array.isArray(model?.people) ? model.people : []) as Any[];
  const fam = S.fam as Any;
  const life = lifeKey(T);
  const home = typeof T.homeOthers === 'function' ? (T.homeOthers() as Any) : {};
  const partners = [home.pt ? fam.partner : null, home.pt2, home.co].filter(Boolean) as Any[];
  const kids = (fam.kids || []) as Any[];
  const grand = (fam.grand || []) as Any[];
  const used = new Set<Any>();
  const take = <X extends Any>(list: X[], ok: (x: X) => boolean): X | null => {
    const x = list.find(v => !used.has(v) && ok(v)) ?? null;
    if (x) used.add(x);
    return x;
  };
  let lastKid = '';
  let ptN = 0;
  const out: HouseholdMember[] = [];
  for (const p of people) {
    const age = Number(p.age);
    const sex = p.sex === 'F' ? 'F' : 'M';
    let id: string;
    let role: HouseholdRole;
    switch (p.role) {
      case 'me':
        role = 'me'; id = 'me';
        break;
      case 'par': {
        role = 'par';
        const which = p.step ? 'step' : p.raised ? 'raised' : p.w ? String(p.w) : sex === 'F' ? 'mom' : 'dad';
        const rec = which === 'mom' || which === 'dad' || which === 'step' ? (fam[which] as Any | null) : null;
        id = which === 'step' || which === 'raised' ? which : which + '|' + fullName(rec);
        break;
      }
      case 'sib':
        role = 'sib'; id = sibKey(age - S.age, sex);
        break;
      case 'pt': {
        role = 'pt';
        const rec = partners[ptN++];
        id = rec === fam.partner ? 'pt|' + fullName(rec) : rec === fam.wife2 ? 'pt2|' + fullName(rec) : rec === fam.co ? 'co|' + fullName(rec) : 'pt#' + ptN;
        break;
      }
      case 'kid': {
        const born = S.age - age;
        if (p.gk) {
          role = 'grandkid';
          const g = take(grand, x => x.bornAt === born && x.sex === p.sex);
          id = 'gk|' + (g ? fullName(g) || String(g.of ?? '') : '') + '|' + born + '|' + sex;
        } else {
          role = 'kid';
          const k = take(kids, x => x.bornAt === born && x.sex === p.sex);
          id = k ? kidKey(k) : 'kid|b' + born + '|' + sex;
          lastKid = id;
        }
        break;
      }
      case 'inlaw':
        role = 'inlaw'; id = 'inlaw|' + lastKid;
        break;
      default:
        continue;
    }
    out.push({ role, age, sex, look: make(life, id, age, sex, p.sk) });
  }
  return out;
}

// ---------------------------------------------------------------- свидетельство

export type FamilyLooks = {
  me: { names: string[]; look: PersonLook | null };
  mother: { name: string; look: PersonLook | null } | null;
  father: { name: string; look: PersonLook | null } | null;
  /** Старшие братья и сёстры при рождении (sibList, d > 0), старшие первыми. */
  siblings: PersonLook[];
};

/**
 * Семья при рождении для свидетельства: те же записи, что certificateVM
 * (S.fam.mom/dad без absent, sibList), возраст — на момент рождения персонажа.
 */
export function familyAppearances(T: Top): FamilyLooks | null {
  const S = T.S as Any;
  if (!S || !S.fam) return null;
  primeSkins(T);
  const fam = S.fam as Any;
  const life = lifeKey(T);
  const atBirth = (m: Any) => (typeof m.age === 'number' ? m.age - S.age : NaN);
  const parent = (key: 'mom' | 'dad') => {
    const m = fam[key] as Any | null;
    if (!m || m.absent) return null;
    const sex = key === 'mom' ? (m.ss ? 'M' : 'F') : m.ss ? 'F' : 'M';
    // sceneModel: кожа матери skinPar("F"), отца skinPar("M").
    return { name: fullName(m), look: make(life, key + '|' + fullName(m), atBirth(m), sex, T.skinPar(key === 'mom' ? 'F' : 'M')) };
  };
  const sibs = (typeof T.sibList === 'function' ? (T.sibList() as { d: number; sex: string }[]) : [])
    .filter(s => s.d > 0)
    .sort((a, b) => b.d - a.d)
    .map(s => make(life, sibKey(s.d, s.sex), s.d, s.sex, sibTone(T, s.sex)))
    .filter((x): x is PersonLook => !!x);
  return {
    me: { names: [String(S.name?.g ?? ''), fullName(S)].filter(Boolean), look: make(life, 'me', 0, S.sex, T.skinMe()) },
    mother: parent('mom'),
    father: parent('dad'),
    siblings: sibs,
  };
}

// ---------------------------------------------------------------- вкладка People

/**
 * Внешность по id строк peopleVM (src/adapters/vm/people.ts): mom, dad, step,
 * sib:i, gp:i, partner, wife2, co, dating, kid:i, given:i. Умершие в списке
 * «In memory» имеют те же id. Друзьям, бывшим и питомцам внешность не
 * назначается: у друзей и бывших в игре нет пола, животных генератор не рисует.
 */
export function peopleAppearances(T: Top): Record<string, PersonLook> {
  const S = T.S as Any;
  const out: Record<string, PersonLook> = {};
  if (!S || !S.fam) return out;
  primeSkins(T);
  const fam = S.fam as Any;
  const life = lifeKey(T);
  const put = (id: string, key: string, age: unknown, sex: unknown, tone: () => unknown) => {
    if (typeof age !== 'number' || !sexOf(sex)) return;
    const look = make(life, key, age, sex, tone());
    if (look) out[id] = look;
  };

  if (fam.mom) put('mom', 'mom|' + fullName(fam.mom), fam.mom.age, fam.mom.ss ? 'M' : 'F', () => T.skinPar('F'));
  if (fam.dad) put('dad', 'dad|' + fullName(fam.dad), fam.dad.age, fam.dad.ss ? 'F' : 'M', () => T.skinPar('M'));
  if (fam.step) put('step', 'step', fam.step.age, 'M', () => T.skinHere(T.skinSeed() + 'step'));

  if (typeof T.sibAliveList === 'function') {
    for (const y of T.sibAliveList() as Any[]) put('sib:' + String(y.i), sibKey(y.d, y.sex), y.age, y.sex, () => sibTone(T, y.sex));
  }
  // Бабушки и дедушки: своей кожи в оригинале нет — берётся кожа родителя той же стороны (skinPar).
  for (const [i, g] of ((fam.gp || []) as Any[]).entries()) {
    put('gp:' + i, 'gp|' + String(g.side) + '|' + String(g.sex), g.age, g.sex, () => T.skinPar(g.side === 'm' ? 'F' : 'M'));
  }

  if (fam.partner) put('partner', 'pt|' + fullName(fam.partner), fam.partner.age, fam.partner.sex, () => T.skinOfP(fam.partner));
  if (fam.wife2) put('wife2', 'pt2|' + fullName(fam.wife2), fam.wife2.age, 'F', () => T.skinOfP(fam.wife2));
  if (fam.co) put('co', 'co|' + fullName(fam.co), fam.co.age, 'F', () => T.skinOfP(fam.co));
  if (fam.dating && !fam.married) {
    const m = fam.dating as Any;
    // Возраст — как в peopleVM; m.age у встречающегося не меняется, поэтому skinOfP(m) стабилен.
    put('dating', 'pt|' + fullName(m), m.age + S.age - m.since, m.sex, () => T.skinOfP(m));
  }

  for (const [i, m] of ((fam.kids || []) as Any[]).entries()) {
    const age = m.alive ? S.age - m.bornAt : typeof m.dA === 'number' ? m.dA : S.age - m.bornAt;
    put('kid:' + i, kidKey(m), age, m.sex, () => T.skinOfKid(m));
  }
  for (const [i, m] of ((fam.given || []) as Any[]).entries()) put('given:' + i, kidKey(m), S.age - m.bornAt, m.sex, () => T.skinOfKid(m));
  return out;
}

// ---------------------------------------------------------------- другие жизни

/**
 * Четыре жизни, начатые в ту же секунду (S.comps), в нынешнем возрасте игрока
 * или в возрасте смерти, если она уже была (как companionVM). Кожи у них в игре
 * нет; оттенок — функцией оригинала skinPick(skinW(страна), ключ), как у фигурок
 * без сохранённой кожи (shelfFig, 166257).
 */
export function companionAppearances(T: Top): (PersonLook | null)[] {
  const S = T.S as Any;
  if (!S) return [];
  const life = lifeKey(T);
  return ((S.comps || []) as Any[]).map(c => {
    const died = !!c.death && typeof c.death.age === 'number' && c.death.age < S.age;
    const age = died ? c.death.age : S.age;
    const key = fullName(c) + '|' + String(c.iso);
    let tone: unknown = null;
    try {
      tone = T.skinPick(T.skinW(c.iso, null), key);
    } catch {
      tone = null;
    }
    return make(life, 'comp|' + key, age, c.sex, tone);
  });
}

// ---------------------------------------------------------------- игрок

/**
 * Сам игрок в нынешнем возрасте или в возрасте смерти (S.deathAt.age):
 * окно смерти, итог жизни, награда в хабе. Тот же ключ 'me', что в сцене,
 * кожа — skinMe() оригинала.
 */
export function playerAppearance(T: Top): PersonLook | null {
  const S = T.S as Any;
  if (!S || !S.name) return null;
  const age = S.deathAt && typeof S.deathAt.age === 'number' ? S.deathAt.age : S.age;
  return make(lifeKey(T), 'me', age, S.sex, T.skinMe());
}
