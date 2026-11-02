// Вкладка Money: деньги персонажа. Только чтение в песочнице.
//
// Повторяет денежный блок оригинала renderStats (game.en.js 201099-201227):
// netWorth, S.income, S.lastFl, ownList, долг при S.money < 0, доход партнёра,
// место по доходу (pctOfIncome / worldPct / rankStr), способ передвижения,
// стиль сбережений INV_N. Тексты — функции и переводы оригинала (L с теми же
// корейскими ключами); суммы — wonStr/usdStr. Формул здесь нет: только
// условия показа из renderStats.
import type { Top } from '../commands';
import { plain } from '../text.ts';

export type FlowItemVM = { label: string; amount: string; up: boolean };
export type PartnerKind = 'm' | 'cp' | 'none';

export type MoneyVM = {
  age: number;
  year: number | null;
  /** renderStats: t = S.age >= 15 — до этого деньги ведёт семья. */
  adult: boolean;
  /** Чистые активы (wonStr(netWorth())), null до 15 лет. */
  netWorth: string | null;
  /** Мелкая строка под суммой: PPP и место по богатству, «больше никто не даст в долг» или «живёте у родителей». */
  netWorthNote: string;
  /** «Без жилья: …», если есть дом или сдаваемое жильё. */
  excludingHome: string;
  /** Годовой доход (wonStr(S.income)), null если дохода нет. */
  income: string | null;
  /** «… a month · about $x a day», либо квинтиль семьи / доход партнёра / «нет дохода». */
  incomeNote: string;
  incomePpp: string;
  /** Нынешняя работа (jobNow), если есть доход и персонаж работает. */
  job: string;
  rank: { country: string; local: string; world: string; whose: 'you' | PartnerKind } | null;
  partner: { kind: PartnerKind; amount: string; note: string } | null;
  /** Итог прошлого года (closeBooks → S.lastFl). */
  pastYear: { delta: string; up: boolean; items: FlowItemVM[] } | null;
  belongings: string[];
  /** Способ передвижения и дорога на работу (wayName, commuteMin). */
  way: string;
  /** Как хранятся сбережения (INV_N[S.invest || 'cash']). */
  invest: string;
  debt: { amount: string; detail: string; maxed: boolean } | null;
};

type Any = Record<string, any>;
const HANGUL = /[가-힣]/;
const safe = (s: string) => (HANGUL.test(s) ? '' : s);

export function moneyVM(T: Top): MoneyVM {
  const S = T.S as Any;
  const L = (strings: string[], ...args: unknown[]) => safe(plain(T.L(strings, ...args)));
  const won = (x: number) => plain(T.wonStr(x));
  const usd = (x: number) => plain(T.usdStr(x));
  const e = T.C();
  const t = S.age >= 15;
  const a = T.netWorth() as number;
  const o = (S.income || 0) as number;
  const maxed = t && S.money < 0 && typeof T.creditLimit === 'function' && S.money <= -T.creditLimit() * 0.98;
  const r = t && a > 0 ? (T.wealthTop(e, a) as number | null) : null;
  const home = t ? S.house + T.rentV() : 0;

  const m = S.fam.partner as Any | null;
  const d = (S.fam.married && m && m.alive && m.inc > 0 ? m.inc : 0) as number;
  const kind = (d ? T.unionOf(m) : 'm') as PartnerKind;
  const livingOn = kind === 'cp' ? L(['동반자 소득으로 생활']) : kind === 'none' ? L(['함께 사는 사람의 소득으로 생활']) : L(['배우자 소득으로 생활']);
  const monthly = (x: number) => L(['월 ', ''], won(x / 12));

  const netWorthNote = t
    ? maxed
      ? L(['더 빌릴 곳이 없어요. 빚 대신 생활비가 줄어요'])
      : usd(a) + ' PPP' + (r != null ? ' · ' + L(['', ' 재산 ', ''], e.ko, plain(T.topStr(r))) : '')
    : L(['아직 부모님 집에서 지냅니다']);

  // dayInc даёт « · about $x a day»; plain() обрезает ведущий пробел, поэтому разделитель ставится заново.
  const perDay = o > 0 ? safe(plain(T.dayInc(o)).replace(/^·\s*/, '')) : '';
  const incomeNote = o > 0
    ? monthly(o) + (perDay ? ' · ' + perDay : '')
    : S.age < 15 ? L(['가정 형편 ', '분위'], S.q) : d ? livingOn : L(['소득 없음']);

  let debt: MoneyVM['debt'] = null;
  if (t && S.money < 0) {
    const b = -S.money;
    const y = S.house + T.rentV();
    const v = ((S.flags.bizKeep && S.flags.bizKeep.v) || 0) + T.bizHeld();
    const k = y > 0 && v > 0
      ? L(['', ' (집 대출 포함) · 순자산은 집값 ', ' 사업체 지분 ', '에서 빚을 뺀 금액이에요'], won(b), plain(T.wa(won(y))), won(v))
      : y > 0
        ? T.nkLife()
          ? L(['', ' · 순자산은 집값 ', '에서 빚을 뺀 금액이에요'], won(b), won(y))
          : T.potV() > 0
            ? L(['', ' (집 대출 · 정해진 일정대로 갚는 중) · 순자산은 집값 ', ' 모은 돈 ', '에서 빚을 뺀 금액이에요'], won(b), plain(T.wa(won(y))), won(T.potV()))
            : L(['', ' (집 대출 포함) · 순자산은 집값 ', '에서 빚을 뺀 금액이에요'], won(b), won(y))
        : v > 0
          ? L(['', ' · 순자산은 사업체 지분 ', '에서 빚을 뺀 금액이에요'], won(b), won(v))
          : won(b);
    const amount = won(b);
    const detail = k.startsWith(amount) ? k.slice(amount.length).replace(/^\s*·\s*|^\s+/, '').trim() : k;
    debt = { amount, detail, maxed };
  }

  const rank = o > 0
    ? { country: plain(e.ko), local: plain(T.rankStr(T.pctOfIncome(e, o))), world: plain(T.rankStr(T.worldPct(o))), whose: 'you' as const }
    : d && S.age >= 18
      ? { country: plain(e.ko), local: plain(T.rankStr(T.pctOfIncome(e, d))), world: plain(T.rankStr(T.worldPct(d))), whose: kind }
      : null;

  const h = S.lastFl as { d: number; it: [string, number][] } | null | undefined;
  const pastYear = t && h && h.it && h.it.length
    ? {
        delta: (h.d >= 0 ? '+' : '−') + won(Math.abs(h.d)),
        up: h.d >= 0,
        items: h.it.map(([label, y]) => ({ label: plain(label), amount: (y < 0 ? '−' : '+') + won(Math.abs(y)), up: y >= 0 })),
      }
    : null;

  let way = '';
  if (t && S.phase === 'life') {
    const c = S.urban && T.isWorking() && !S.nomad && T.CITIES[S.cur] && !T.nearWork() && !T.homeWork() && S.flags.comm && S.flags.comm.m != null && S.flags.comm.k === T.workKey()
      ? T.commuteMin()
      : 0;
    way = plain(T.capS(T.wayName())) + (c ? ' · ' + L(['출퇴근 하루 ', ''], plain(T.minStr(c))) : '');
  }

  return {
    age: S.age,
    year: typeof S.by === 'number' ? S.by + S.age : null,
    adult: t,
    netWorth: t ? won(a) : null,
    netWorthNote,
    excludingHome: home > 0 ? L(['집을 빼면 ', ''], won(a - home)) : '',
    income: o > 0 ? won(o) : null,
    incomeNote,
    incomePpp: o > 0 ? usd(o) + ' PPP' : '',
    job: o > 0 && T.isWorking() ? plain(T.capS(T.jobNow())) : '',
    rank,
    partner: d && S.age >= 18 ? { kind, amount: won(d), note: usd(d) + ' PPP · ' + monthly(d) } : null,
    pastYear,
    belongings: t ? (T.ownList() as string[]).map(plain).filter(Boolean) : [],
    way,
    invest: t ? plain(T.INV_N[S.invest || 'cash'] ?? '') : '',
    debt,
  };
}
