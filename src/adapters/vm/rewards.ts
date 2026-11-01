// Награды мобильной мета-экономики за прожитую жизнь («A life lived» в хабе).
// Это правило нового мобильного слоя, а не механика оригинала: оно только
// читает итог жизни из core (уровень образования, работа, брак, долги, архив
// жизней). Суммы и набор пунктов — из макета HubCute (версия 107) и ждут
// утверждения продукта; меняются в REWARD_RULES.
import type { Top } from '../commands';
import { plain } from '../text.ts';
import { playerAppearance, type PersonLook } from './appearance.ts';

export const REWARD_RULES = {
  school: { dollars: 60 },
  firstJob: { dollars: 40 },
  married: { dollars: 50 },
  debtPaid: { dollars: 100 },
  firstInCountry: { gems: 2 },
} as const;

export type RewardKind = keyof typeof REWARD_RULES;
export type RewardItem = { kind: RewardKind; detail: string; dollars: number; gems: number };
export type LifeReward = {
  lifeId: string; name: string; given: string; sex: string; years: string; age: number; iso: string;
  /** Внешность в возрасте смерти: окно в хабе показывает портрет и после перезагрузки, когда жизни в core уже нет. */
  look: PersonLook | null;
  items: RewardItem[]; dollars: number; gems: number;
};

/** Итог только что завершённой жизни. Вызывается в песочнице сразу после смерти. */
export function lifeReward(T: Top): LifeReward | null {
  const S = T.S;
  if (!S || S.phase !== 'dead' || S.replay) return null;
  const items: RewardItem[] = [];
  const add = (kind: RewardKind, detail: string) => {
    const r = REWARD_RULES[kind] as { dollars?: number; gems?: number };
    items.push({ kind, detail, dollars: r.dollars ?? 0, gems: r.gems ?? 0 });
  };
  // EDU оригинала (52985): 3 — старшая школа и выше.
  if (S.edu >= 3) add('school', plain(T.EDU[Math.min(S.edu, T.EDU.length - 1)]));
  // Первая работа: оригинал считает наймы в S.stats.jobs (92975). Подпись — первая
  // годовая отметка S.years[].w (yearWork, 113025), которая не учёба, служба,
  // поиск работы, пенсия или домашнее хозяйство.
  if ((S.stats?.jobs || 0) > 0) {
    const tpl = (k: string) => plain(T.L(Object.assign([k], { raw: [k] })));
    const notWork = new Set([tpl('학생'), tpl('대학생'), tpl('대학원생'), tpl('일자리 찾는 중'), tpl('은퇴')]);
    for (const f of [() => T.svcLbl(), () => T.clergyEmer(), () => T.shortJob('homemaker')]) {
      try { const x = plain(f() || ''); if (x) notWork.add(x); } catch { /* нет в этой жизни */ }
    }
    const first = (S.years || []).map((y: { w?: string }) => plain(y?.w || '')).find((w: string) => w && !notWork.has(w));
    add('firstJob', first ?? plain(T.shortJob(S.flags?.lastJob || S.job) || ''));
  }
  // Брак: число браков и имя супруга(и), если известно.
  if ((S.fam.marriages || 0) > 0 || S.fam.marriedAt != null) add('married', plain(S.fam.partner?.name?.full ?? ''));
  // Долги: состояние было отрицательным хотя бы в одном году, а к концу — нет.
  const hadDebt = (S.years || []).some((y: { nw?: number }) => typeof y?.nw === 'number' && y.nw < 0);
  if (hadDebt && T.netWorth() >= 0) add('debtPaid', '');
  // Первая жизнь в этой стране: архив жизней (recordLife уже добавил эту жизнь).
  const lives = T.lsGet(T.LIVES_KEY, []) as { iso?: string }[];
  if (Array.isArray(lives) && lives.filter(l => l && l.iso === S.born).length === 1) add('firstInCountry', plain(T.placeTag(T.CBY[S.born])));
  const by = typeof S.by === 'number' ? S.by : null;
  return {
    lifeId: String(S.lifeAt ?? T.lifeIdOf(S)),
    name: S.name.full, given: S.name.g, sex: S.sex, age: S.deathAt?.age ?? S.age, iso: S.born,
    years: by != null ? `${by}–${by + (S.deathAt?.age ?? S.age)}` : '',
    look: playerAppearance(T),
    items,
    dollars: items.reduce((a, x) => a + x.dollars, 0),
    gems: items.reduce((a, x) => a + x.gems, 0),
  };
}
