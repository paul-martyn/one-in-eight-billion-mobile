// Read-only данные для экранов. Строятся из состояния core и его же функций;
// формул здесь нет. Все функции вызываются внутри host.read(), который в
// режиме разработки проверяет, что игровой RNG не тронут.
import type { Top } from './commands';
import { plain, segments, smallParts, type Segment } from './text.ts';

export type StatKey = 'hl' | 'h' | 'sm' | 'so';
export type Stats = Record<StatKey, number>;
export type Fx = { k: StatKey; d: number }[];

export type JournalEntryVM = { i: number; age: number; year: number | null; kind: string; text: string; fact: string; question: string; fx: Fx; mine: boolean };
export type ChoiceVM = { k: string; label: string; sub: string };
export type DecisionVM = { id: string; title: string; body: string; fact: string; question: string; input: { placeholder: string } | null; reflect: boolean; choices: ChoiceVM[] };
export type CompanionVM = { name: string; given: string; iso: string; place: string; sex: 'F' | 'M'; quintile: number; family: string; status: string; died: boolean; deathAge: number | null; deathLabel: string };
export type FamilyRowVM = { label: string; value: string; detail: Record<string, string> };

export type LifeVM = {
  name: string; given: string; sex: 'F' | 'M'; age: number; year: number | null; yearProgress: number;
  place: string; bornIn: string; bornIso: string; curIso: string; migrated: boolean;
  stats: Stats; status: Segment[]; job: string;
  netWorth: string; income: string; lifeExpectancy: number;
  speed: number; speeds: number[]; paused: boolean; fastForward: boolean; secondsPerYear: number;
  pending: DecisionVM | null;
  focus: { current: string | null; options: { k: string; name: string; desc: string }[] };
  family: FamilyRowVM[];
  companions: CompanionVM[];
  logLength: number;
};

const FX_KEYS: StatKey[] = ['hl', 'h', 'sm', 'so'];
function fxOf(fx: unknown): Fx {
  if (!fx || typeof fx !== 'object') return [];
  const o = fx as Record<string, number>;
  return FX_KEYS.filter(k => typeof o[k] === 'number' && Math.round(o[k]!) !== 0).map(k => ({ k, d: Math.round(o[k]!) }));
}

export function journalEntry(T: Top, e: Record<string, any>, i: number): JournalEntryVM {
  const by = T.S?.by;
  return {
    i,
    age: e.a,
    year: typeof by === 'number' ? by + e.a : null,
    kind: e.kind,
    text: plain(e.text),
    fact: plain(e.fact),
    question: plain(e.q),
    fx: fxOf(e.fx),
    mine: e.kind === 'dec' || !!e.d,
  };
}

export function decisionVM(pd: Record<string, any> | null): DecisionVM | null {
  if (!pd || !pd.view) return null;
  const v = pd.view;
  return {
    id: pd.id,
    title: plain(v.title),
    body: plain(v.body),
    fact: plain(v.fact),
    question: v.q && typeof v.q === 'string' ? plain(v.q) : '',
    input: v.input ? { placeholder: plain(v.ph) } : null,
    reflect: !!v.q,
    choices: (v.choices || []).map((c: Record<string, unknown>) => ({ k: String(c.k), label: plain(c.label), sub: plain(c.sub) })),
  };
}

export function companionVM(T: Top, c: Record<string, any>, age: number): CompanionVM {
  const dead = !!c.death && c.death.age < age;
  return {
    name: c.name?.full ?? '', given: c.name?.g ?? '', iso: c.iso,
    place: c.urban && c.city ? plain(T.cityIn(T.CBY[c.iso].ko, c.city)) : plain(T.placeTag(T.CBY[c.iso])),
    sex: c.sex, quintile: c.q, family: plain(T.QSHORT_E[c.q]),
    status: plain(T.compStatus(c, age)), died: dead, deathAge: dead ? c.death.age : null, deathLabel: dead && c.death.cause !== 'suic' ? plain(c.death.label) : '',
  };
}

export function lifeVM(T: Top): LifeVM {
  const S = T.S;
  const B = T.BB();
  const place = S.urban && S.city ? plain(T.cityIn(T.C().ko, S.city)) : plain(T.placeTag(T.C()));
  const status = segments(T.statusLine());
  const focusKeys: string[] = T.focusOptions();
  return {
    name: S.name.full, given: S.name.g, sex: S.sex, age: S.age, year: typeof S.by === 'number' ? S.by + S.age : null,
    yearProgress: Math.max(0, Math.min(1, S.t)),
    place, bornIn: plain(T.placeTag(B)), bornIso: S.born, curIso: S.cur, migrated: S.cur !== S.born,
    stats: { hl: S.st.hl, h: S.st.h, sm: S.st.sm, so: S.st.so },
    status, job: plain(T.jobNow()),
    netWorth: plain(T.wonStr(T.netWorth())), income: plain(T.wonStr(S.income || 0)),
    lifeExpectancy: T.leOf(B, S.sex),
    speed: S.speed, speeds: [...T.SPEEDS], paused: !!S.paused, fastForward: !!S.ff, secondsPerYear: S.yearSec / S.speed,
    pending: decisionVM(S.pending),
    focus: { current: S.focus ?? null, options: focusKeys.map(k => ({ k, name: plain(T.FOCUS[k].n), desc: plain(T.focusD(k)) })) },
    family: [],
    companions: (S.comps || []).map((c: Record<string, any>) => companionVM(T, c, S.age)),
    logLength: S.log.length,
  };
}

/** Строки семьи из famRows. Вызывать только в renderPass-точках (famRows может обратиться к RNG). */
export function familyRows(rows: [string, string][]): FamilyRowVM[] {
  return rows.map(([label, value]) => {
    const { main, parts } = smallParts(value);
    return { label: plain(label), value: main, detail: parts };
  });
}

export type CertificateVM = {
  certNo: string; name: string; given: string; family: string; sex: 'F' | 'M';
  month: string; year: number; country: string; iso: string; place: string; urban: boolean;
  story: string; quintile: number; quintileText: string;
  mother: { name: string; age: number; job: string; role: string } | null;
  father: { name: string; age: number; job: string; role: string } | null;
  /** Старшие и младшие братья и сёстры при рождении: разница в возрасте (+ старше). */
  siblings: { diff: number; sex: string }[];
  religion: string; home: string; lifeExpectancy: number; under5: string; gdp: string;
  share: string; shareOneIn: number; ruralLine: string; secondsPerYear: number;
  stats: Stats; survival: { to5: string; to18: string; to65: string };
  countryFacts: { label: string; value: string }[];
  companions: CompanionVM[];
  era: string | null;
};

export function certificateVM(T: Top, certNo: string): CertificateVM {
  const S = T.S;
  const B = T.BB();
  const parent = (m: Record<string, any>, kind: 'mom' | 'dad') => (m && !m.absent ? {
    name: m.name?.full ?? '', age: m.age, job: m.job ? plain(T.parentJobName(m)) : '',
    role: m.ss ? (kind === 'mom' ? 'father' : 'mother') : kind === 'mom' ? 'mother' : 'father',
  } : null);
  const sh = T.share(B);
  const surv = (a: number) => plain(T.pctStr(T.cohortL(S.born, S.sex, a)));
  return {
    certNo, name: S.name.full, given: S.name.g, family: S.name.base, sex: S.sex,
    month: plain(T.monthEn ? T.monthEn(S.bm) : String(S.bm)), year: S.by,
    country: plain(T.placeTag(B)), iso: S.born,
    place: S.urban ? plain(T.cityIn(B.ko, S.city)) : plain(T.ruralLbl()) + ', ' + plain(T.placeTag(B)), urban: !!S.urban,
    story: plain(T.birthStory()), quintile: S.q, quintileText: plain((T.notNation(S.born) ? T.QCERT_P : T.QCERT)[S.q]),
    mother: parent(S.fam.mom, 'mom'), father: parent(S.fam.dad, 'dad'),
    siblings: (T.sibList() as { d: number; sex: string }[]).map(s => ({ diff: s.d, sex: s.sex })),
    religion: plain(T.relName()), home: plain(T.pHomeWord()),
    lifeExpectancy: T.leOf(B, S.sex), under5: plain(T.pctStr(1 - T.cohortL(S.born, S.sex, 5), 1)), gdp: plain(T.usdStr(B.ppp)),
    share: plain(T.fmtShare(sh)), shareOneIn: Math.round(1 / sh), ruralLine: plain(T.ruralLine()), secondsPerYear: S.yearSec,
    stats: { hl: S.st.hl, h: S.st.h, sm: S.st.sm, so: S.st.so },
    survival: { to5: surv(5), to18: surv(18), to65: surv(65) },
    countryFacts: (T.countryRows(B) as [string, string][]).map(([label, value]) => ({ label: plain(label), value: plain(value) })),
    companions: (S.comps || []).map((c: Record<string, any>) => companionVM(T, c, 0)),
    era: S.era && S.era !== 'now' ? S.era : null,
  };
}

export type EndedVM = { name: string; age: number; cause: string; story: string; epitaph: string[]; lives: { me: boolean; name: string; place: string; age: number; story: string }[] };

export function endedVM(T: Top): EndedVM {
  const S = T.S;
  const me = T.summaryOf(S);
  const all = [{ me: true, o: me }, ...(S.comps || []).map((o: unknown) => ({ me: false, o }))]
    .sort((a: any, b: any) => a.o.death.age - b.o.death.age);
  return {
    name: S.name.full, age: S.deathAt?.age ?? S.age, cause: plain(S.deathAt?.label ?? ''),
    story: plain(T.storyOf(me)),
    epitaph: Array.isArray(S.endD?.epi) ? S.endD.epi.map(plain) : [],
    lives: all.map((x: any) => ({ me: x.me, name: x.o.name.full, place: plain(T.placeTag(T.CBY[x.o.iso])), age: x.o.death.age, story: plain(T.storyOf(x.o)) })),
  };
}

export type PastLifeVM = { at: number; name: string; country: string; sex: string; age: number; cause: string; job: string };
export function pastLives(T: Top): PastLifeVM[] {
  const list = T.lsGet(T.LIVES_KEY, []) as Record<string, any>[];
  return (Array.isArray(list) ? list : []).slice().reverse().map(r => ({ at: r.at, name: r.name, country: plain(r.ko), sex: r.sex, age: r.age, cause: plain(r.cause), job: plain(r.job) }));
}

export type ResumeVM = { phase: 'birth' | 'life'; name: string; age: number; place: string } | null;
export function resumeVM(T: Top): ResumeVM {
  const s = T.lsGet(T.SAVE_KEY, null);
  const S = s && s.S;
  if (!S || !(S.phase === 'life' || S.phase === 'birth') || !S.cur || !T.CBY[S.cur]) return null;
  return { phase: S.phase, name: S.name?.full ?? '', age: S.age, place: plain(T.placeTag(T.CBY[S.cur])) };
}
