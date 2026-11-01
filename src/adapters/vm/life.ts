// Данные экрана жизни, которых нет в снимке адаптера. Только чтение: функции
// оригинала вызываются в песочнице useCoreView (копия S, отдельный RNG).
// Формул и правил здесь нет — только тексты и порядок, как их показывал
// старый интерфейс (номера строк — game.en.js эталона 0.8.98).
import type { Top } from '../commands';
import { plain } from '../text.ts';

/** Перевод строки оригинала функцией L (1367): шаблон без подстановок. */
function tr(T: Top, korean: string): string {
  if (typeof T.L !== 'function') return '';
  const out = plain(T.L(Object.assign([korean], { raw: [korean] })));
  // Нет перевода — L возвращает исходную корейскую строку; такую строку не показываем.
  return /[가-힣]/.test(out) ? '' : out;
}

export type DecisionChoiceItem = { type: 'choice'; n: number; k: string; label: string; sub: string };
export type DecisionGroupItem = {
  type: 'group'; from: number; to: number; label: string; sub: string;
  chips: { k: string; label: string; sub: string }[];
};
export type DecisionItem = DecisionChoiceItem | DecisionGroupItem;

export type DecisionExtraVM = {
  /** Id открытого решения (сверяется с life.pending.id). */
  id: string;
  /** Заголовок вида решения: «A big decision», «A small choice», «Decided with family», «A pause». */
  kind: string;
  /** Возраст членов семьи, упомянутых в тексте (decFa, 203083). */
  famLine: string;
  /** Варианты в порядке и группировке decChoicesHTML (203092-203113). */
  items: DecisionItem[];
  /** Недоступные варианты (view.locked) — показываются выключенными (203137). */
  locked: { label: string; sub: string }[];
  /** Поле имени питомца (view.name, 203133): текст уходит в choose как note. */
  nameInput: { placeholder: string; max: number } | null;
};

/** Дополнение к life.pending: вид решения, группы вариантов, недоступные варианты, поле имени. */
export function decisionExtra(T: Top): DecisionExtraVM | null {
  const pd = T.S?.pending;
  if (!pd || !pd.view) return null;
  const v = pd.view;
  const id = String(pd.id ?? '');
  // Заголовок окна решения в showDecision (203129-203136).
  const kind = v.q
    ? tr(T, '잠시 멈춤')
    : id.startsWith('sm_')
      ? tr(T, '작은 선택')
      : typeof T.ddWithFam === 'function' && T.ddWithFam(pd.id)
        ? tr(T, '가족과 함께 정해요')
        : tr(T, '중대 결정');
  let famLine = '';
  try {
    famLine = typeof T.decFa === 'function' ? plain(T.decFa(v)) : '';
  } catch {
    famLine = '';
  }
  const choices: Record<string, unknown>[] = Array.isArray(v.choices) ? v.choices : [];
  const items: DecisionItem[] = [];
  const seen = new Set<string>();
  let n = 0;
  for (const c of choices) {
    if (!c.g) {
      n += 1;
      items.push({ type: 'choice', n, k: String(c.k), label: plain(c.label), sub: plain(c.sub) });
      continue;
    }
    const g = String(c.g);
    if (seen.has(g)) continue;
    seen.add(g);
    const members = choices.filter(s => s.g === c.g);
    const from = n + 1;
    n += members.length;
    items.push({
      type: 'group', from, to: n, label: plain(c.gl), sub: plain(c.gs),
      chips: members.map(s => ({ k: String(s.k), label: plain(s.chip || s.label), sub: plain(s.sub) })),
    });
  }
  const locked = (Array.isArray(v.locked) ? v.locked : []).map((l: Record<string, unknown>) => ({ label: plain(l.label), sub: plain(l.sub) }));
  const nameInput = v.name && typeof v.name === 'object' ? { placeholder: plain(v.name.ph), max: Number(v.name.max) || 12 } : null;
  return { id, kind, famLine, items, locked, nameInput };
}

export type LifeNoticeTexts = {
  /** «'Next decision' has stopped so you can see it.» */
  ffStopped: string;
  kidLost: string;
  bigDx: string;
  kidDx: string;
  jobLost: string;
  businessClosed: string;
  focusPause: string;
};

/** Тексты всплывающих сообщений оригинала (frame0 207845-207907, HOOK.year 210177-210183). */
export function lifeNoticeTexts(T: Top): LifeNoticeTexts {
  const sp = T.L_CJK ? '' : ' ';
  const stop = tr(T, "'다음 결정까지'를 멈췄어요.");
  const join = (a: string, b: string) => (a && b ? a + sp + b : '');
  const both = (a: string, b: string) => (a && b ? a + ' ' + b : '');
  const lookingTail = tr(T, '새 일을 찾는 동안은 벌이가 줄어요.');
  return {
    ffStopped: stop,
    kidLost: tr(T, "자녀를 먼저 떠나보낸 해예요. '다음 결정까지'를 멈췄어요."),
    bigDx: tr(T, "큰 병을 진단받은 해예요. '다음 결정까지'를 멈췄어요."),
    kidDx: join(tr(T, '아이가 진단을 받은 해예요.'), stop),
    // Здесь оригинал соединяет пробелом при любом языке (207884-207889).
    jobLost: both(tr(T, '일이 끊긴 해예요.'), lookingTail),
    businessClosed: both(tr(T, '사업을 접은 해예요.'), lookingTail),
    focusPause: tr(T, '올해를 어디에 쓸지 고른 뒤 계속하세요.'),
  };
}
