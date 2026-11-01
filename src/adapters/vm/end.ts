// Итоги прожитой жизни — экран «This life» (EndCute, холст v107). Только чтение
// в песочнице useCoreView: функции оригинала вызываются на копии S в фазе
// 'dead'. Источники — то, что старый интерфейс показывал на странице смерти
// (showDeath, game.en.js 205275-205482): свидетельство о смерти (история
// storyOf(summaryOf(S)), причина, доля причины, выживаемость когорты, ожидаемая
// продолжительность), «Moments to remember» (momentsOf), семья (famRows через
// peopleVM, partnerCell), имущество (estateItems, leftCellHTML, estateHTML) и
// финал endingData() (S.endD). Формул здесь нет; тексты — переводы оригинала.
import type { Top } from '../commands';
import { plain } from '../text.ts';
import { ageBand, peopleAppearances, playerAppearance, type PersonLook } from './appearance.ts';
import { peopleVM } from './people.ts';

type Any = Record<string, any>;
const HANGUL = /[가-힣]/;
/** Перевод не найден (виден корейский текст) — строка не показывается. */
const safe = (s: string) => (HANGUL.test(s) ? '' : s);

/** Шаблон оригинала L (1367) по его корейским частям. */
function tr(T: Top, parts: string[], ...args: unknown[]): string {
  if (typeof T.L !== 'function') return '';
  return safe(plain(T.L(Object.assign([...parts], { raw: [...parts] }), ...args)));
}

const cap = (T: Top, s: string) => (s && typeof T.capS === 'function' ? plain(T.capS(s)) : s);

/**
 * Свидетельство о смерти showDeath (205306-205373) переводится одним шаблоном
 * целиком, поэтому его предложения нельзя получить через L по частям. Ключ
 * перевода — lHash корейских частей шаблона, соединённых '\x01', как в L0
 * (проверено по эталону 0.8.98). Подстановка {n} и правка английского текста
 * (enFix, curFix) — как в ветке LANG === 'en' функции L0.
 */
const DCERT_KEY = '281khouc24m';
function dcertPiece(T: Top, re: RegExp, args: unknown[]): string {
  if (T.LANG !== 'en') return '';
  const tpl = T.I18N_T?.[DCERT_KEY];
  const m = typeof tpl === 'string' ? re.exec(tpl) : null;
  if (!m || m[1] == null) return '';
  const filled = m[1].replace(/\{(\d+)\}/g, (_: string, n: string) => String(args[Number(n)] ?? ''));
  return safe(plain(T.curFix(T.enFix(filled))));
}

/** Абзацы HTML оригинала (несколько <p> подряд) как отдельные строки. */
const paragraphs = (html: unknown): string[] => String(html ?? '').split(/<\/p>/i).map(plain).filter(Boolean);

const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export type EndChapterVM = {
  /** Номер записи в журнале жизни (S.log). */
  i: number;
  age: number;
  year: number | null;
  text: string;
  /** Запись о смерти — последняя глава. */
  death: boolean;
  /** Человек из семьи, названный в записи, в его возрасте на тот год. */
  who: { name: string; look: PersonLook } | null;
};

export type EndPersonVM = {
  id: string;
  /** Имя или (у братьев и сестёр без имени) подпись роли. */
  name: string;
  /** Подпись роли оригинала, если показано имя («Spouse», «Daughter»). */
  role: string;
  /** Друг: подпись роли даёт интерфейс (у друзей в игре нет роли). */
  friend: boolean;
  /** Возраст в год смерти игрока (у живых). */
  age: number | null;
  /** Близость, годы вместе, работа, строка о смерти — тексты оригинала. */
  details: string[];
  look: PersonLook | null;
  /** Умер раньше игрока. */
  gone: boolean;
};

export type EndMoneyVM = {
  /** Что было на момент смерти (estateItems): стоимость, долг отдельно. */
  rows: { label: string; value: string; debt: boolean }[];
  /** Долгов нет (S.money ≥ 0 и нет долга кооперативу). */
  noDebt: boolean;
  /** «Wealth left behind» (leftCellHTML, с 15 лет): сумма и место по богатству в стране. */
  total: { label: string; value: string; rank: string } | null;
  /** Как разделили наследство (estateHTML, с 18 лет). */
  estate: { title: string; how: string; heirs: { name: string; value: string }[] } | null;
};

export type EndSummaryVM = {
  /** Ключ жизни в архиве (S.lifeAt), для состояния экрана. */
  lifeId: string;
  name: string;
  given: string;
  /** Пол для местоимений подписей (pubSex оригинала). */
  pub: 'F' | 'M';
  age: number;
  bornYear: number | null;
  diedYear: number | null;
  /** Место рождения: город и страна или страна. */
  bornPlace: string;
  /** История жизни storyOf(summaryOf(S)) — абзац свидетельства о смерти. */
  story: string;
  /** Ожидаемая продолжительность при рождении (leOf(BB(), пол)). */
  lifeExpectancy: number;
  /** Когорта и ожидаемая продолжительность — предложение свидетельства о смерти. */
  cohort: string;
  chapters: EndChapterVM[];
  ending: {
    /** «Cause of death» из свидетельства и причина S.deathAt.label. */
    causeLabel: string;
    cause: string;
    /**
     * Самоубийство или смерть «не в счёт» (deathAt.nc): оригинал не выносит такую
     * причину в краткие записи (endingData.cause и архив жизней — пусто или
     * «passed away»), а в свидетельстве приглушает её (класс quiet).
     */
    quiet: boolean;
    /** Строки финала endingData(): где умер, кто проводил, похороны, последние слова. */
    lines: string[];
    /** Справка оригинала при самоубийстве (suicDeadHTML). */
    help: string[];
    /** Доля той же группы причин среди смертей этого возраста в стране смерти. */
    share: { text: string; percent: number | null; country: string; band: string; of20: number } | null;
    epitaph: string[];
  };
  stats: { hl: number; h: number; sm: number; so: number };
  /** Заголовок последнего года из endingData (head). */
  lastYearHead: string;
  people: EndPersonVM[];
  /** Пометка оригинала к семье на странице смерти («as in the last year»). */
  peopleNote: string;
  /** Строки семьи без отдельного человека (внуки и т. п.). */
  familyNotes: { label: string; value: string }[];
  money: EndMoneyVM | null;
  /** Жизнь записана в архив прошлых жизней (recordLife). */
  saved: boolean;
  /** Игрок в возрасте смерти. */
  look: PersonLook | null;
};

/** Сколько «моментов» берётся у momentsOf (оригинал показывал 16; макет — 6 глав). */
export const END_CHAPTERS = 6;

export function endSummary(T: Top): EndSummaryVM | null {
  const S = T.S as Any;
  if (!S || S.phase !== 'dead' || !S.deathAt) return null;
  const e = S.deathAt as Any;
  const age: number = e.age;
  const by: number | null = typeof S.by === 'number' ? S.by : null;
  const B = T.BB() as Any;
  const pub: 'F' | 'M' = T.pubSex() === 'F' ? 'F' : 'M';

  // ---- Свидетельство о смерти (showDeath 205289-205317)
  const where = (T.CBY[e.where] || T.C()) as Any;
  let cohort = '';
  try {
    const n = T.survL(S.born, S.sex)[Math.min(111, age + 1)];
    const r = T.lifeTable(B, S.sex).e0 as number;
    const s = age - r;
    const peer = T.transLived() ? tr(T, ['또래']) : S.sex === 'F' ? tr(T, ['여자아이']) : tr(T, ['남자아이']);
    const args: unknown[] = [];
    args[13] = '';
    args[14] = T.esc(B.ko);
    args[15] = peer;
    args[16] = T.pctStr(n);
    args[17] = B.ko;
    args[18] = S.sex === 'F' ? tr(T, ['여성']) : tr(T, ['남성']);
    args[19] = r.toFixed(1);
    args[20] = Math.abs(s).toFixed(1);
    args[21] = s >= 0 ? tr(T, ['더']) : tr(T, ['덜']);
    cohort = dcertPiece(T, /<p class="ctx">\{13\}([\s\S]*?)<\/p>/, args);
  } catch {
    cohort = '';
  }
  const causeLabel = dcertPiece(T, /<div class="cause">([^<{]*)<b>\{12\}<\/b>/, []).trim();
  let share: EndSummaryVM['ending']['share'] = null;
  if (typeof e.share === 'number') {
    const band = plain(T.bandName(age));
    const text = e.share < 0.005
      ? tr(T, ['', '에서 ', ' 사망 가운데 같은 원인 계열은 1%가 채 되지 않습니다 (WHO 지역 패턴 기반 추정). '], T.esc(where.ko), T.bandName(age))
      : tr(T, ['', '에서 ', ' 사망의 약 ', '%가 같은 원인 계열입니다 (WHO 지역 패턴 기반 추정). '], T.esc(where.ko), T.bandName(age), Math.max(1, Math.round(e.share * 100)));
    // of20 — та же доля на 20 фигурках макета (округление; 0 — фигурки не рисуются).
    if (text) share = { text, percent: e.share < 0.005 ? null : Math.max(1, Math.round(e.share * 100)), country: plain(where.ko), band, of20: Math.round(e.share * 20) };
  }

  // ---- Финал жизни (endingData, 205991-206078)
  const D = (S.endD || {}) as Any;
  const lines = [D.died, D.attend ? D.attend : '', D.funeral, D.lastLoss, D.last, D.said]
    .map(x => cap(T, plain(x)))
    .filter(Boolean);
  const help = typeof T.suicDeadHTML === 'function' ? paragraphs(T.suicDeadHTML()).map(safe).filter(Boolean) : [];

  // ---- Люди (famRows через peopleVM, partnerCell 204767)
  const pv = peopleVM(T);
  const looks = peopleAppearances(T);
  let together = '';
  try {
    together = plain((T.partnerCell(age) as [string, string])[1]);
  } catch {
    together = '';
  }
  const people: EndPersonVM[] = [];
  for (const p of pv.family) {
    people.push({
      id: p.id, name: p.name || p.role, role: p.name ? p.role : '', friend: false, age: p.age, look: looks[p.id] ?? null, gone: false,
      details: [p.bond, p.id === 'partner' ? together : '', p.job, ...p.notes].filter(Boolean),
    });
  }
  for (const f of pv.friends) {
    people.push({ id: f.id, name: f.name, role: '', friend: true, age: null, look: null, gone: false, details: [pv.friendsBond].filter(Boolean) });
  }
  for (const m of pv.memory) {
    people.push({
      id: m.id, name: m.name || m.role, role: m.name ? m.role : '', friend: false, age: null, look: looks[m.id] ?? null, gone: true,
      details: [m.line, m.id === 'partner' ? together : '', m.job].filter(Boolean),
    });
  }

  // ---- Главы: «Moments to remember» (momentsOf 202629)
  const finders = [
    ...pv.family.filter(p => p.age != null).map(p => ({ id: p.id, name: p.name || p.role, search: p.search, ageAt: (a: number) => (p.age as number) - (age - a) })),
    ...pv.memory.filter(m => m.age != null && m.year != null && by != null).map(m => ({
      id: m.id, name: m.name || m.role, search: m.search,
      ageAt: (a: number) => (a <= (m.year as number) - (by as number) ? (m.age as number) - ((m.year as number) - (by as number) - a) : -1),
    })),
  ].filter(f => looks[f.id] && f.search.length)
    .map(f => ({ ...f, re: new RegExp(`(?<![\\p{L}\\p{N}])(?:${f.search.map(escRe).join('|')})(?![\\p{L}\\p{N}])`, 'u') }));
  const logIndex = new Map((S.log as object[]).map((x, i) => [x, i]));
  const chapters: EndChapterVM[] = (T.momentsOf(END_CHAPTERS) as Any[]).map(x => {
    const text = plain(x.text);
    let who: EndChapterVM['who'] = null;
    let at = Infinity;
    for (const f of finders) {
      const m = f.re.exec(text);
      const then = f.ageAt(x.a);
      const base = looks[f.id];
      if (m && m.index < at && then >= 0 && base) {
        at = m.index;
        who = { name: f.name, look: { ...base, band: ageBand(then) } };
      }
    }
    return { i: logIndex.get(x) ?? -1, age: x.a, year: by != null ? by + x.a : null, text, death: x.kind === 'death', who };
  });

  // ---- Имущество (estateItems 109676, leftCellHTML 204760, estateHTML 204741)
  let money: EndMoneyVM | null = null;
  {
    const items = (T.estateItems() as [string, number][]).filter(([, v]) => typeof v === 'number' && v !== 0);
    const rows = items.map(([label, v]) => ({ label: cap(T, plain(label)), value: (v < 0 ? '−' : '') + plain(T.wonStr(Math.abs(v))), debt: v < 0 }));
    const noDebt = (S.money ?? 0) >= 0 && !(T.sovOwe() > 0);
    let total: EndMoneyVM['total'] = null;
    if (S.age >= 15) {
      const left = T.leftWorth() as number;
      const top = left > 0 ? T.wealthTop(T.C(), left) : null;
      total = {
        label: tr(T, ['남긴 재산 (한국 체감)']),
        value: plain(T.wonStr(left)),
        rank: top != null ? tr(T, ['', ' 재산 ', ''], T.C().ko, T.topStr(top)) : '',
      };
    }
    let estate: EndMoneyVM['estate'] = null;
    if (age >= 18) {
      try {
        const k = T.estateKept() as { rows: [string, number][]; how: string };
        const heirs = (k.rows || []).map(([n, v]) => ({ name: cap(T, plain(n)), value: plain(T.wonStr(v)) }));
        const how = plain(k.how);
        if (how || heirs.length) estate = { title: tr(T, ['남긴 재산은 이렇게 나뉘었습니다']), how, heirs };
      } catch {
        estate = null;
      }
    }
    if (rows.length || total) money = { rows, noDebt, total, estate };
  }

  const st = S.st as Any;
  return {
    lifeId: String(S.lifeAt ?? ''),
    name: S.name.full, given: S.name.g, pub, age,
    bornYear: by, diedYear: by != null ? by + age : null,
    bornPlace: S.urban && S.city ? plain(T.cityIn(B.ko, S.city)) : plain(T.placeTag(B)),
    story: plain(T.storyOf(T.summaryOf(S))),
    lifeExpectancy: T.leOf(B, S.sex),
    cohort,
    chapters,
    ending: {
      causeLabel, cause: plain(e.label), quiet: e.cause === 'suic' || !!e.nc, lines, help, share,
      epitaph: Array.isArray(D.epi) ? (D.epi as unknown[]).map(plain).filter(Boolean) : [],
    },
    stats: { hl: Math.round(st.hl), h: Math.round(st.h), sm: Math.round(st.sm), so: Math.round(st.so) },
    lastYearHead: plain(D.head),
    people,
    peopleNote: cap(T, tr(T, ['마지막 해의 모습'])),
    familyNotes: pv.familyNotes,
    money,
    saved: !!S.recorded,
    look: playerAppearance(T),
  };
}
