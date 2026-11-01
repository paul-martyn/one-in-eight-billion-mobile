// Данные экрана «Your start in life» (BirthOdds), которых нет в CertificateVM.
// Только чтение функций и полей оригинала (запускается в песочнице useCoreView);
// формул здесь нет — порядок и выбор вызовов повторяют showCert (game.en.js
// 200286-200469) и строки фактов об образовании (73480, 88093, 122962).
import type { Top } from '../commands';
import { plain } from '../text.ts';

export type FactVM = { label: string; value: string };

export type EduOddsVM = {
  /** Доля поколения страны рождения, заканчивающего старшую (или единую среднюю) школу: eduProbs(...).p3. */
  school: string;
  /** Доля поколения, заканчивающего университет: eduProbs(...).p4 (оригинал называет её оценкой). */
  uni: string;
  /** oneSec(): в стране единая средняя школа — подпись «secondary school» вместо «high school». */
  oneSecondary: boolean;
  /** eduSrc(e, 2): источник доли окончивших школу (UNESCO UIS / оценка). */
  schoolSource: string;
};

export type HomeCompareVM = {
  /** Страна, которую игрок указал как свою настоящую (S.home). */
  home: string;
  /** Страна рождения этой жизни. */
  here: string;
  same: boolean;
  /** Страна игрока угадана по языку браузера (S.homeG), а не выбрана вручную. */
  guessed: boolean;
  rows: {
    lifeExpectancy: { home: number; here: number };
    under5: { home: string; here: string };
    schoolYears: { home: number; here: number };
    gdp: { home: string; here: string };
  };
};

export type BirthOddsVM = {
  /** share(BB()) — доля рождений (или населения в режиме pop) страны рождения, 0–1. */
  share: number;
  /** UI.prefs.mode === 'pop': доля считается по населению, а не по рождениям. */
  byPopulation: boolean;
  /** S.era === 'past': доля относится к году рождения S.by, а не к сегодняшнему дню. */
  pastEra: boolean;
  edu: EduOddsVM | null;
  /** Четыре строки countryRows(BB()) (порядок строк задан функцией оригинала 202853-202875). */
  facts: { births: FactVM | null; population: FactVM | null; urban: FactVM | null; gdp: FactVM | null };
  home: HomeCompareVM | null;
};

const fact = (rows: unknown, i: number): FactVM | null => {
  const r = Array.isArray(rows) ? (rows[i] as [unknown, unknown] | undefined) : undefined;
  return r ? { label: plain(r[0]), value: plain(r[1]) } : null;
};

export function birthOddsView(T: Top): BirthOddsVM | null {
  const S = T.S;
  if (!S || !S.born) return null;
  const e = T.BB();

  // Доли окончивших школу и университет в стране рождения — те же числа, которые
  // оригинал показывает фактами в журнале (usecFact, uniShareF). Если девочкам
  // закрыта средняя школа (eraEdu: ban), доли страны вводят в заблуждение — не показываем.
  let edu: EduOddsVM | null = null;
  const ep = T.eduProbs(T.B(), S.sex, S.q, S.urban);
  if (ep && !ep.ban && typeof ep.p3 === 'number' && typeof ep.p4 === 'number') {
    edu = {
      school: plain(T.pctStr(ep.p3)),
      uni: plain(T.pctStr(ep.p4)),
      oneSecondary: !!T.oneSec(),
      schoolSource: plain(T.eduSrc(ep, 2)),
    };
  }

  const rows = T.countryRows(e);
  const facts = { births: fact(rows, 0), population: fact(rows, 1), gdp: fact(rows, 4), urban: fact(rows, 6) };

  // Сравнение с настоящей страной игрока (#certHome в showCert, 200425-200466).
  let home: HomeCompareVM | null = null;
  const l = S.home && T.CBY[S.home] ? T.CBY[S.home] : null;
  const d = l && S.era && S.era !== 'now' ? T.eraAt(l, S.by) : l;
  if (d) {
    home = {
      home: plain(T.placeTag(d)),
      here: plain(T.placeTag(e)),
      same: d.id === e.id,
      guessed: !!S.homeG,
      rows: {
        lifeExpectancy: { home: T.leOf(d, S.sex), here: T.leOf(e, S.sex) },
        under5: { home: plain(T.pctStr(1 - T.cohortL(d.id, S.sex, 5), 1)), here: plain(T.pctStr(1 - T.cohortL(S.born, S.sex, 5), 1)) },
        schoolYears: { home: d.eys, here: e.eys },
        gdp: { home: plain(T.usdStr(d.ppp)), here: plain(T.usdStr(e.ppp)) },
      },
    };
  }

  return {
    share: T.share(e),
    byPopulation: T.UI?.prefs?.mode === 'pop',
    pastEra: S.era === 'past',
    edu,
    facts,
    home,
  };
}
