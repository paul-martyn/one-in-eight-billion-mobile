// Вкладка «Odds»: данные из функций оригинала (game.en.js), без собственных формул.
// Строитель выполняется в песочнице адаптера (копия S, отдельный RNG) — только чтение.
//
// Источники:
// - доля рождений: share(BB()) / fmtShare (198798, 198952), как в #certOdds (200389-200399);
// - доход: rankStr(pctOfIncome(C(), S.income)), rankStr(worldPct(S.income)) (56509, 56514, 145699);
// - семья: S.q и QCERT/QCERT_P (198715), как в свидетельстве;
// - выживание: survL(S.born, S.sex) и мировая таблица lifeTable(WORLD_C | eraWorldC(S.by)),
//   при переезде ещё lifeTable(C()) — те же источники, что у chartSVG (202818-202847);
// - ожидаемая продолжительность жизни: leOf(BB(), S.sex) (199048) и e0 мировой таблицы;
// - страна: countryRows(BB()) / countryRows(C()) (202853), заголовок как в renderCountry (202880);
// - сопутствующие жизни: compStatus(c, age) (147329) по прожитым годам, без будущего.
import type { Top } from '../commands';
import { plain } from '../text.ts';

export type OddsSex = 'F' | 'M';

export type OddsShareVM = { share: string; oneIn: number; country: string; year: number | null; mode: 'births' | 'pop' };
export type OddsWealthVM =
  | { kind: 'income'; country: string; inCountry: string; inWorld: string }
  | { kind: 'family'; country: string; text: string };
export type OddsSurvivalFindingVM = { pct: string; toAge: number; country: string; year: number | null; sex: OddsSex; reached: boolean };

export type OddsCurveVM = { id: 'born' | 'world' | 'current'; country: string; l: number[] };
export type OddsChartVM = {
  curves: OddsCurveVM[];
  /** Возраст отметки (min(100, age)) и доля доживших до него в когорте рождения. */
  markAge: number;
  markL: number;
  markPct: string;
  /** Ожидаемая продолжительность жизни при рождении: страна рождения и мир (e0 таблицы). */
  le: number;
  worldLe: number;
};

export type OddsCountryVM = {
  key: 'born' | 'current';
  country: string;
  year: number | null;
  projection: boolean;
  tiles: { label: string; value: string }[];
  rows: { label: string; value: string }[];
};

export type OddsHistoryStep = { from: number; to: number; status: string; died: boolean };

export type OddsVM = {
  name: string;
  given: string;
  sex: OddsSex;
  age: number;
  birthYear: number | null;
  urban: boolean;
  bornPlace: string;
  bornCountry: string;
  migrated: boolean;
  nowPlace: string;
  quintile: number;
  share: OddsShareVM;
  wealth: OddsWealthVM;
  survival: OddsSurvivalFindingVM;
  chart: OddsChartVM;
  countries: OddsCountryVM[];
  /** История статусов каждой сопутствующей жизни по прожитым годам (порядок как в S.comps). */
  companionHistory: OddsHistoryStep[][];
};

/** Строки countryRows, которые показываются плитками (порядок строк countryRows неизменен во всех языках). */
const TILE_ROWS = [2, 8, 4, 3, 6, 11] as const;
const CHART_MAX_AGE = 100;

const toArray = (l: ArrayLike<number>, n: number): number[] => {
  const out: number[] = [];
  for (let i = 0; i <= n; i++) out.push(Number(l[i] ?? 0));
  return out;
};

function countryVM(T: Top, key: 'born' | 'current', c: Record<string, any>): OddsCountryVM {
  const rows = (T.countryRows(c) as [string, string][]).map(([label, value]) => ({ label: plain(label), value: plain(value) }));
  const tileSet = new Set<number>(TILE_ROWS);
  const tiles = TILE_ROWS.map(i => rows[i]).filter((r): r is { label: string; value: string } => !!r);
  const year = typeof c.yr === 'number' ? c.yr : null;
  return {
    key,
    country: plain(T.placeTag(c)),
    year,
    projection: year != null && year >= T.NOW_Y,
    tiles,
    rows: rows.filter((_, i) => !tileSet.has(i)),
  };
}

function historyOf(T: Top, c: Record<string, any>, age: number): OddsHistoryStep[] {
  const out: OddsHistoryStep[] = [];
  for (let a = 0; a <= age; a++) {
    const died = !!c.death && c.death.age < a;
    const status = plain(T.compStatus(c, a));
    const last = out[out.length - 1];
    if (last && last.status === status) last.to = a;
    else out.push({ from: a, to: a, status, died });
    if (died) break;
  }
  return out;
}

export function oddsView(T: Top): OddsVM {
  const S = T.S;
  const B = T.BB();
  const C = T.C();
  const sex: OddsSex = S.sex === 'F' ? 'F' : 'M';
  const year = typeof S.by === 'number' ? S.by : null;
  const bornCountry = plain(T.placeTag(B));
  // Место рождения: S.bornCity / S.bornUrban (newLife, 62713, 62827); S.city меняется при переездах.
  const bornUrban = S.bornUrban != null ? !!S.bornUrban : !!S.urban;
  const bornPlace = bornUrban && S.bornCity ? plain(T.cityIn(B.ko, S.bornCity)) : bornCountry;
  const migrated = !!S.mig && S.cur !== S.born;
  const nowPlace = S.urban && S.city ? plain(T.cityIn(C.ko, S.city)) : plain(T.placeTag(C));

  const sh: number = T.share(B);
  const share: OddsShareVM = {
    share: plain(T.fmtShare(sh)), oneIn: Math.round(1 / sh), country: bornCountry, year,
    mode: T.UI?.prefs?.mode === 'pop' ? 'pop' : 'births',
  };

  const income = Number(S.income) || 0;
  const wealth: OddsWealthVM = income > 0
    ? { kind: 'income', country: plain(T.placeTag(C)), inCountry: plain(T.rankStr(T.pctOfIncome(C, income))), inWorld: plain(T.rankStr(T.worldPct(income))) }
    : { kind: 'family', country: bornCountry, text: plain((T.notNation(S.born) ? T.QCERT_P : T.QCERT)[S.q]) };

  const toAge = S.age >= 1 ? S.age : 5;
  const survival: OddsSurvivalFindingVM = {
    pct: plain(T.pctStr(T.cohortL(S.born, S.sex, toAge))), toAge, country: bornCountry, year, sex, reached: S.age >= 1,
  };

  // chartSVG: страна рождения, мир (эпоха — eraWorldC(S.by)), страна проживания при переезде.
  const born = T.survL(S.born, S.sex) as ArrayLike<number>;
  const worldTable = T.lifeTable(S.era && S.era !== 'now' ? T.eraWorldC(S.by) : T.WORLD_C, S.sex);
  const curves: OddsCurveVM[] = [
    { id: 'born', country: bornCountry, l: toArray(born, CHART_MAX_AGE) },
    { id: 'world', country: plain(T.WORLD_C.ko), l: toArray(worldTable.l, CHART_MAX_AGE) },
  ];
  if (migrated) curves.push({ id: 'current', country: plain(T.placeTag(C)), l: toArray(T.lifeTable(C, S.sex).l, CHART_MAX_AGE) });
  const markAge = Math.min(CHART_MAX_AGE, S.age);
  const markL = Number(born[markAge] ?? 0);
  const chart: OddsChartVM = {
    curves, markAge, markL, markPct: plain(T.pctStr(markL)),
    le: T.leOf(B, S.sex), worldLe: worldTable.e0,
  };

  const countries = [countryVM(T, 'born', B)];
  if (migrated) countries.push(countryVM(T, 'current', C));

  return {
    name: S.name?.full ?? '', given: S.name?.g ?? '', sex, age: S.age, birthYear: year, urban: bornUrban,
    bornPlace, bornCountry, migrated, nowPlace, quintile: Number(S.q) || 0,
    share, wealth, survival, chart, countries,
    companionHistory: (S.comps || []).map((c: Record<string, any>) => historyOf(T, c, S.age)),
  };
}
