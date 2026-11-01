// Вкладка People: люди вокруг персонажа. Только чтение в песочнице.
//
// Источник — S.fam, S.flags и функции оригинала, которыми пользуется панель
// семьи (famRows, game.en.js 201978-202322): bondWord, parentJobName,
// partnerWork, kidLine, kidGone, kidLeft, sibAliveList/sibCall, gpLabel,
// petsOfLife/petWord. Подписи ролей — переводы оригинала через L с теми же
// корейскими ключами шаблонов, что и в famRows. Условия показа повторяют
// famRows (кто «не живёт с нами», кто в тюрьме, кто ушёл); формул нет.
import type { Top } from '../commands';
import { plain } from '../text.ts';

export type PersonGroup = 'family' | 'friends' | 'pets';
/** Тон слова о близости: какое из слов bondWord вернул оригинал. */
export type BondTone = 'close' | 'good' | 'distant' | 'hard' | 'none';

export type PersonVM = {
  id: string;
  group: PersonGroup;
  /** Подпись роли из оригинала («Mother», «Son», «Spouse»…); пусто — подпись даёт интерфейс. */
  role: string;
  /** Полное имя; пусто, если в игре у человека нет имени (братья, сёстры, бабушки). */
  name: string;
  /** Имена, по которым человек упоминается в дневнике (с учётом регистра). */
  search: string[];
  /** Фразы оригинала, которыми дневник называет человека («your maternal grandmother»), без учёта регистра. */
  phrases: string[];
  /** Родственник, которого дневник называет «your + роль» (родители, братья и сёстры). */
  kin: boolean;
  age: number | null;
  bond: string;
  tone: BondTone;
  /** Работа или занятие (parentJobName / partnerWork / kidLine). */
  job: string;
  /** Прочие факты оригинала (национальность, «в тюрьме», «приёмный»…). */
  notes: string[];
  /** Не рядом сейчас: не живёт с семьёй, бывший партнёр, питомец не с вами. */
  away: boolean;
  pet: boolean;
};

export type MemoryVM = {
  id: string;
  role: string;
  name: string;
  search: string[];
  phrases: string[];
  kin: boolean;
  /** Возраст на момент смерти, если игра его хранит. */
  age: number | null;
  /** Календарный год смерти (S.by + возраст персонажа в тот год), если известен. */
  year: number | null;
  /** Строка оригинала о смерти («died at 70», «died at 3 · …»). */
  line: string;
  job: string;
};

export type PeopleVM = {
  age: number;
  year: number | null;
  family: PersonVM[];
  friends: PersonVM[];
  pets: PersonVM[];
  /** Одно слово близости для друзей в целом (оригинал не различает друзей). */
  friendsBond: string;
  friendsTone: BondTone;
  /** Сводка оригинала о друзьях («2 old friends still around»…). */
  friendsNote: string;
  /** Друзья появляются в панели оригинала только с 12 лет. */
  friendsShown: boolean;
  /** Строки семьи без отдельного человека: кто растит, родная мать, внуки, братья и сёстры ушли из дома. */
  familyNotes: { label: string; value: string }[];
  memory: MemoryVM[];
};

type Any = Record<string, any>;
type Tr = (strings: string[], ...args: unknown[]) => string;

const tr = (T: Top): Tr => (strings, ...args) => plain(T.L(strings, ...args));
const HANGUL = /[가-힣]/;
/** Перевод из оригинала; если ключ не нашёлся (виден корейский текст), строка не показывается. */
const safe = (s: string) => (HANGUL.test(s) ? '' : s);

function toneOf(L: Tr, word: string): BondTone {
  if (!word) return 'none';
  if (word === L(['가까운 사이'])) return 'close';
  if (word === L(['무난한 사이'])) return 'good';
  if (word === L(['서먹한 사이'])) return 'distant';
  if (word === L(['힘든 사이'])) return 'hard';
  return 'none';
}

const nameOf = (m: Any | null | undefined): string => (m && m.name && typeof m.name === 'object' ? String(m.name.full ?? '') : '');
const givenOf = (m: Any | null | undefined): string => (m && m.name && typeof m.name === 'object' ? String(m.name.g ?? '') : '');
const searchOf = (...names: string[]) => [...new Set(names.map(n => n.trim()).filter(n => n.length >= 2))];

/** Поисковые фразы должны совпадать с грамматикой дневника, а не с подписью UI. */
export function kinMentionPhrases(T: Top, role: string): string[] {
  if (T.LANG !== 'ru' || !role) return [];
  const noun = role.toLocaleLowerCase('ru');
  if (!T.ruGender(noun)) return [];
  return [...new Set([
    '{{0:ваш|ваша|ваше|ваши}} {0}',
    '{{0:вашего|вашей|вашего|ваших}} {0}#р',
    '{{0:вашему|вашей|вашему|вашим}} {0}#д',
    '{{0:вашего|вашу|ваше|ваших}} {0}#в',
    '{{0:вашим|вашей|вашим|вашими}} {0}#т',
    '{{0:вашем|вашей|вашем|ваших}} {0}#п',
  ].map(template => plain(T.ruFill(template, [noun]))))];
}

function withKinPhrases<P extends { role: string; kin: boolean; phrases: string[] }>(T: Top, p: P): P {
  return p.kin ? { ...p, phrases: [...new Set([...p.phrases, ...kinMentionPhrases(T, p.role)])] } : p;
}

export function peopleVM(T: Top): PeopleVM {
  const S = T.S as Any;
  const fam = S.fam as Any;
  const L = tr(T);
  const year = typeof S.by === 'number' ? S.by + S.age : null;
  const yearAt = (playerAge: unknown) => (typeof S.by === 'number' && typeof playerAge === 'number' ? S.by + playerAge : null);
  const bond = (m: Any, role: string) => (S.age >= 6 ? plain(T.bondWord(m, role)) : '');
  const cap = (s: string) => (s ? plain(T.capS(s)) : '');

  const family: PersonVM[] = [];
  const friends: PersonVM[] = [];
  const pets: PersonVM[] = [];
  const memory: MemoryVM[] = [];
  const familyNotes: { label: string; value: string }[] = [];
  let rows: [string, string][] | null = null;
  /** Строка famRows с данной подписью (уже переведённая оригиналом). */
  const familyRow = (label: string) => {
    rows ??= T.famRows() as [string, string][];
    const row = rows.find(([l]) => plain(l) === label);
    return row ? { label, value: plain(row[1]) } : null;
  };

  const person = (p: Omit<PersonVM, 'tone' | 'pet' | 'search' | 'phrases' | 'kin'> & { search?: string[]; phrases?: string[]; kin?: boolean; pet?: boolean }): PersonVM => ({
    ...p, search: p.search ?? [], phrases: p.phrases ?? [], kin: !!p.kin, tone: toneOf(L, p.bond), pet: !!p.pet,
  });
  const diedLine = (age: unknown) => safe(L(['<span class="gone">', '세에 별세</span>'], age));

  // famRows: o(m) — работа родителя; «в отставке · бывший X» с 65 лет.
  const parentJob = (m: Any) => {
    if (!m.job || m.absent) return '';
    const j = plain(T.parentJobName(m));
    return m.job !== 'homemaker' && m.age >= 65 ? L(['은퇴 · 전 ', ''], j) : j;
  };
  // famRows: n(m) — «не живёт с нами».
  const apart = (m: Any) => !!m.absent && !(!m.alive && (m.dTold || (m.sep != null && m.vis !== 'fade') || m.met != null));

  const parent = (id: string, m: Any | null | undefined, role: string, bondRole: string) => {
    if (!m) return;
    const name = nameOf(m);
    const search = searchOf(givenOf(m), name);
    if (apart(m)) {
      family.push(person({ id, group: 'family', role, name, search, age: null, bond: '', job: '', notes: [safe(L(['<span class="gone">함께 살지 않음</span>']))].filter(Boolean), away: true, kin: true }));
      return;
    }
    if (!m.alive) {
      memory.push({ id, role, name, search, phrases: [], kin: true, age: typeof m.age === 'number' ? m.age : null, year: yearAt(m.diedAt), line: diedLine(m.age), job: parentJob(m) });
      return;
    }
    const prison = m.pr != null && m.pr > S.age;
    family.push(person({
      id, group: 'family', role, name, search, age: m.age,
      bond: prison ? '' : bond(m, bondRole),
      job: prison ? '' : parentJob(m),
      notes: prison ? [L(['교도소에 있음'])] : [],
      away: false, kin: true,
    }));
  };

  parent('mom', fam.mom, fam.mom?.ss ? L(['아버지', ''], T.LBL) : L(['어머니', ''], T.LBL), 'mom');
  parent('dad', fam.dad, fam.dad?.ss ? L(['어머니', ''], T.LBL) : L(['아버지', ''], T.LBL), 'dad');

  {
    const row = typeof T.adoptBmRow === 'function' ? T.adoptBmRow() : null;
    if (row) familyNotes.push({ label: L(['낳아 준 어머니']), value: plain(row) });
  }

  if (fam.step) {
    const m = fam.step as Any;
    const role = L(['새아버지', ''], T.LBL);
    if (m.name !== undefined || m.job) parent('step', m, role, 'step');
    else if (m.alive) family.push(person({ id: 'step', group: 'family', role, name: '', age: m.age, bond: bond(m, 'step'), job: '', notes: [], away: false, kin: true }));
    else memory.push({ id: 'step', role, name: '', search: [], phrases: [], kin: true, age: m.age ?? null, year: null, line: diedLine(m.age), job: '' });
  }

  // Братья и сёстры: имён в игре нет — только слово (sibCall) и возраст.
  {
    const alive = (T.sibAliveList() as Any[]).slice().sort((a, b) => b.age - a.age);
    if (alive.length) {
      alive.forEach((y, i) => family.push(person({ id: `sib:${y.i ?? i}`, group: 'family', role: cap(plain(T.sibCall(y))), name: '', age: y.age, bond: '', job: '', notes: [], away: false, kin: true })));
    }
    const dead = (fam.older || 0) + (fam.sibBorn || 0) - alive.length;
    const label = L(['형제자매']);
    if (dead > 0) memory.push({ id: 'sibs', role: label, name: '', search: [], phrases: [], kin: false, age: null, year: null, line: alive.length ? L(['먼저 떠난 ', '명'], dead) : L(['모두 먼저 떠남']), job: '' });
    const left = alive.length && typeof T.sibsLeft === 'function' ? T.sibsLeft() : 0;
    if (left > 0) familyNotes.push({ label, value: left === alive.length ? L(['모두 집을 떠남']) : L(['', '명은 집을 떠남'], left) });
    const pr = alive.length && typeof T.sibInPr === 'function' ? T.sibInPr() : null;
    if (pr) familyNotes.push({ label, value: L(['', ' 교도소에 있음'], pr.w) });
  }

  // Бабушки и дедушки (S.fam.gp): в панели семьи оригинала их нет, но они есть в жизни
  // и в дневнике. Сторона отца, которого персонаж не знал (dadNever), не показывается.
  for (const [i, g] of ((fam.gp || []) as Any[]).entries()) {
    if (g.side === 'f' && T.dadNever()) continue;
    const label = plain(T.gpLabel(g));
    const role = cap(label);
    const phrases = label ? [label] : [];
    if (g.alive) family.push(person({ id: `gp:${i}`, group: 'family', role, name: '', phrases, age: g.age, bond: '', job: '', notes: [], away: false }));
    else memory.push({ id: `gp:${i}`, role, name: '', search: [], phrases, kin: false, age: g.age, year: null, line: diedLine(g.age), job: '' });
  }

  {
    const row = T.raisedHere() ? familyRow(L(['나를 키우는 어른'])) : null;
    if (row) familyNotes.push(row);
  }

  // Партнёр (famRows: e.partner).
  if (fam.partner) {
    const m = fam.partner as Any;
    const union = T.unionOf(m) as 'm' | 'cp' | 'none';
    const role = m.divorced
      ? m.nkL && m.sep ? L(['북에 남은 배우자']) : m.sep ? L(['따로 사는 배우자']) : union === 'm' ? L(['전 배우자']) : L(['헤어진 사람'])
      : ({ m: L(['배우자']), cp: L(['동반자']), none: L(['함께 사는 사람']) } as const)[union] ?? L(['배우자']);
    const name = nameOf(m);
    const search = searchOf(givenOf(m), name);
    const work = m.alive && !m.divorced ? (T.partnerWork(m) as { t: string; m: string } | null) : null;
    if (work) {
      const g = m.lb && fam.married ? T.CBY[m.lbIn || (S.flags.famWait && S.flags.famWait.from)] : null;
      const notes: string[] = [];
      if (m.nat) notes.push(plain(T.natWord(m.nat)));
      if (g && g.id !== S.cur) notes.push(L(['', '에서 기다림'], g.ko));
      family.push(person({
        id: 'partner', group: 'family', role, name, search, age: m.age,
        bond: fam.married ? bond(m, 'pt') : '',
        job: plain(T.capS(work.t)) + (work.m ? ' · ' + plain(work.m) : ''),
        notes, away: false,
      }));
    } else if (!m.alive) {
      memory.push({ id: 'partner', role, name, search, phrases: [], kin: false, age: null, year: null, line: '', job: '' });
    } else {
      family.push(person({ id: 'partner', group: 'family', role, name, search, age: null, bond: '', job: '', notes: [], away: true }));
    }
  }

  // Бывшие (S.flags.exs, последние три — как famRows).
  for (const [i, x] of ((S.flags.exs || []) as Any[])
    .filter(p => !(fam.partner && fam.partner.name && p.n === fam.partner.name.full))
    .slice(-3)
    .entries()) {
    const role = x.d ? (x.w ? L(['먼저 떠난 배우자']) : L(['먼저 떠난 사람'])) : x.s ? (x.nk ? L(['북에 남은 배우자']) : L(['따로 사는 배우자'])) : x.w ? L(['전 배우자']) : L(['헤어진 사람']);
    const together = x.y >= 1 ? L(['', '년을 함께'], x.y) : '';
    const name = String(x.n ?? '');
    if (x.d) memory.push({ id: `ex:${i}`, role, name, search: searchOf(name), phrases: [], kin: false, age: null, year: null, line: together, job: '' });
    else family.push(person({ id: `ex:${i}`, group: 'family', role, name, search: searchOf(name), age: null, bond: '', job: '', notes: together ? [together] : [], away: true }));
  }

  if (fam.wife2) {
    const m = fam.wife2 as Any;
    const role = L(['두 번째 아내']);
    const name = nameOf(m);
    if (m.alive) {
      const w = typeof T.w2Work === 'function' ? plain(T.w2Work(m)) : '';
      family.push(person({ id: 'wife2', group: 'family', role, name, search: searchOf(givenOf(m), name), age: m.age, bond: bond(m, 'pt2'), job: w ? plain(T.capS(w)) : '', notes: [], away: false }));
    } else memory.push({ id: 'wife2', role, name, search: searchOf(givenOf(m), name), phrases: [], kin: false, age: null, year: null, line: '', job: '' });
  }
  if (fam.co) {
    const m = fam.co as Any;
    const notes: string[] = [];
    if (m.kids) notes.push(plain(L([' · 아이 ', '명'], m.kids)).replace(/^·\s*/, ''));
    if (!m.home) notes.push(plain(L([' · 따로 삶'])).replace(/^·\s*/, ''));
    family.push(person({ id: 'co', group: 'family', role: L(['남편의 다른 아내']), name: nameOf(m), search: searchOf(givenOf(m), nameOf(m)), age: m.age, bond: '', job: '', notes, away: !m.home }));
  }
  if (fam.dating && !fam.married) {
    const m = fam.dating as Any;
    family.push(person({
      id: 'dating', group: 'family', role: m.arr ? L(['혼담 중']) : L(['연애 중']),
      name: nameOf(m), search: searchOf(givenOf(m), nameOf(m)), age: m.age + S.age - m.since,
      bond: bond(Object.assign({ alive: true }, m), 'date'), job: '',
      notes: m.nat ? [plain(T.natWord(m.nat))] : [], away: false,
    }));
  }

  // Дети (famRows: e.kids).
  {
    const kids = (fam.kids || []) as Any[];
    const parents = new Set(kids.filter(m => m.op && m.op.full).map(m => m.op.full));
    kids.forEach((m, i) => {
      const role = m.sex === 'F' ? L(['딸', ''], T.LBL) : L(['아들', ''], T.LBL);
      const name = nameOf(m);
      const search = searchOf(givenOf(m), name);
      if (m.alive) {
        const notes: string[] = [];
        if (parents.size > 1 && m.op && m.op.full) notes.push(m.ops === 'M' ? L(['아빠 ', '', ''], T.callName(m.op), T.LBL) : L(['엄마 ', '', ''], T.callName(m.op), T.LBL));
        if (m.adopted) notes.push(L([' · 입양']).replace(/^·\s*/, ''));
        if (m.sk) notes.push((m.exOf ? L([' · 전 배우자의 아이']) : L([' · 배우자의 아이'])).replace(/^·\s*/, ''));
        const age = S.age - m.bornAt;
        if (m.priv && age >= 6 && age < 18) notes.push(L([' · 사립학교']).replace(/^·\s*/, ''));
        const lines = (T.kidLine(m) as string[]).map(plain).filter(Boolean);
        family.push(person({ id: `kid:${i}`, group: 'family', role, name, search, age, bond: bond(m, 'kid'), job: lines[0] ?? '', notes: [...notes, ...lines.slice(1)], away: false }));
      } else if (m.cut != null) {
        family.push(person({ id: `kid:${i}`, group: 'family', role, name, search, age: null, bond: '', job: '', notes: [L(['전 배우자의 아이']), L(['연락이 끊김'])], away: true }));
      } else {
        const gone = plain(T.kidGone(m)).replace(/^·\s*/, '');
        const left = plain(T.kidLeft(m)).replace(/^·\s*/, '');
        memory.push({ id: `kid:${i}`, role, name, search, phrases: [], kin: false, age: typeof m.dA === 'number' ? m.dA : null, year: typeof m.dA === 'number' ? yearAt(m.bornAt + m.dA) : null, line: gone, job: left });
      }
    });
    for (const [i, m] of ((fam.given || []) as Any[]).entries()) {
      family.push(person({ id: `given:${i}`, group: 'family', role: L(['입양 보낸 아이']), name: nameOf(m), search: searchOf(givenOf(m), nameOf(m)), age: S.age - m.bornAt, bond: '', job: '', notes: [], away: true }));
    }
  }

  for (const [label, key] of [[L(['손주']), 'grand'], [L(['증손주']), 'ggrand'], [L(['고손주']), 'gggrand']] as const) {
    if (!S.flags[key]) continue;
    const row = familyRow(label);
    if (row) familyNotes.push(row);
  }

  // Друзья (famRows: с 12 лет; не больше трёх имён, общее слово близости).
  let friendsBond = '';
  let friendsNote = '';
  const friendsShown = S.age >= 12;
  if (friendsShown) {
    const left = S.flags.fN ? Math.max(0, S.flags.fN - (S.flags.fGone || 0)) : null;
    friendsBond = left === 0 ? '' : bond({ alive: true, name: { full: S.name.full } }, 'friend');
    let names: string[] = [];
    try {
      const bad = T.frBad() as Set<string>;
      names = ((Array.isArray(S.flags.frNames) ? S.flags.frNames : []) as string[])
        .filter(k => k && !bad.has(k))
        .slice(0, left == null ? 3 : Math.min(3, left));
    } catch {
      names = [];
    }
    const far = typeof T.kinFar === 'function' && T.kinFar() && S.mig && (!T.oldFrHere() || (S.migY != null && S.migY - 15 > S.age - S.migY));
    friendsNote = left === 0
      ? L(['<span class="gone">오랜 친구들이 모두 곁을 떠났습니다</span>'])
      : left != null && S.flags.fGone
        ? far
          ? left === 1 ? L(['고향에 있는 오랜 친구 한 명']) : L(['고향에 있는 오랜 친구 ', '명'], left)
          : left === 1 ? L(['곁에 남은 오랜 친구 한 명']) : L(['곁에 남은 오랜 친구 ', '명'], left)
        : '';
    names.forEach((n, i) => friends.push(person({ id: `friend:${i}`, group: 'friends', role: '', name: n, search: searchOf(n), age: null, bond: '', job: '', notes: [], away: false })));
  }

  // Питомцы (petsOfLife): нынешние и прежние.
  for (const [i, p] of ((T.petsOfLife() || []) as { n: string; k: string; now: boolean }[]).entries()) {
    pets.push(person({ id: `pet:${i}`, group: 'pets', role: cap(plain(T.petWord(p.k))), name: String(p.n ?? ''), search: searchOf(String(p.n ?? '')), age: null, bond: '', job: '', notes: [], away: !p.now, pet: true }));
  }

  return {
    age: S.age, year,
    family: byKin(family).map(clean).map(p => withKinPhrases(T, p)), friends, pets,
    friendsBond: safe(friendsBond), friendsTone: toneOf(L, friendsBond), friendsNote: safe(friendsNote), friendsShown,
    familyNotes: familyNotes.filter(n => n.value && !HANGUL.test(n.label + n.value)),
    memory: byKin(memory).map(m => withKinPhrases(T, { ...m, role: safe(m.role), line: safe(m.line), job: safe(m.job) })),
  };
}

/** Порядок как в семье: родители, партнёр, дети, братья и сёстры, бабушки и дедушки, бывшие. */
const KIN_ORDER = ['mom', 'dad', 'step', 'partner', 'dating', 'wife2', 'co', 'kid', 'given', 'sib', 'sibs', 'gp', 'ex'];
function byKin<T extends { id: string }>(list: T[]): T[] {
  const rank = (id: string) => { const k = KIN_ORDER.indexOf(id.split(':')[0]!); return k < 0 ? KIN_ORDER.length : k; };
  return list.map((x, i) => ({ x, i })).sort((a, b) => rank(a.x.id) - rank(b.x.id) || a.i - b.i).map(o => o.x);
}

function clean(p: PersonVM): PersonVM {
  return { ...p, role: safe(p.role), bond: safe(p.bond), job: safe(p.job), notes: p.notes.map(safe).filter(Boolean) };
}

