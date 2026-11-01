// Окно смерти на экране жизни (LiveCute.dc.html, frame «died»). Только чтение
// в песочнице useCoreView: поля S.deathAt, которые записал die() оригинала
// (85975-86064), и строки свидетельства о смерти showDeath (205306-205331)
// через словарь L оригинала. Формул и правил здесь нет.
import type { Top } from '../commands';
import { plain } from '../text.ts';

export type DeathVM = {
  name: string;
  given: string;
  /** Возраст смерти (S.deathAt.age). */
  age: number;
  /** Год рождения S.by и год смерти S.by + age (как «${S.by} – ${S.by + e.age}» в showDeath). */
  born: number | null;
  died: number | null;
  /** Причина: S.deathAt.label (causeLabel оригинала или подпись события). */
  cause: string;
  /**
   * Доля той же группы причин среди смертей этого возраста в стране смерти —
   * первая фраза .ctx свидетельства (205316); пусто, если share не посчитан
   * (самоубийство, причина вне весов).
   */
  share: string;
  /** Примечание к последней записи журнала вида «death» (у самоубийства — WHO и телефон помощи). */
  note: string;
};

type Any = Record<string, any>;
const HANGUL = /[가-힣]/;

/** Перевод шаблона L оригинала с подстановками; без перевода — пусто. */
function tl(T: Top, parts: string[], ...args: unknown[]): string {
  if (typeof T.L !== 'function') return '';
  const out = plain(T.L(Object.assign([...parts], { raw: [...parts] }), ...args));
  return HANGUL.test(out) ? '' : out;
}

export function deathView(T: Top): DeathVM | null {
  const S = T.S as Any;
  const d = S?.deathAt as Any | undefined;
  if (!S || S.phase !== 'dead' || !d) return null;
  const age = typeof d.age === 'number' ? d.age : S.age;
  const by = typeof S.by === 'number' ? S.by : null;

  let share = '';
  const where = T.CBY?.[d.where] as Any | undefined;
  if (d.share != null && where && typeof T.bandName === 'function') {
    const esc = typeof T.esc === 'function' ? (x: unknown) => String(T.esc(x)) : (x: unknown) => String(x ?? '');
    const country = esc(where.ko);
    const band = T.bandName(age);
    // showDeath 205316: «… 1%가 채 되지 않습니다» при share < 0.005, иначе «약 N%».
    share = d.share < 0.005
      ? tl(T, ['', '에서 ', ' 사망 가운데 같은 원인 계열은 1%가 채 되지 않습니다 (WHO 지역 패턴 기반 추정). '], country, band)
      : tl(T, ['', '에서 ', ' 사망의 약 ', '%가 같은 원인 계열입니다 (WHO 지역 패턴 기반 추정). '], country, band, Math.max(1, Math.round(d.share * 100)));
  }

  const log = (Array.isArray(S.log) ? S.log : []) as Any[];
  let note = '';
  for (let i = log.length - 1; i >= 0; i--) {
    const e = log[i];
    if (e && e.kind === 'death') { note = plain(e.fact); break; }
  }

  return {
    name: S.name?.full ?? '',
    given: S.name?.g ?? '',
    age,
    born: by,
    died: by != null ? by + age : null,
    cause: plain(d.label ?? ''),
    share,
    note,
  };
}
