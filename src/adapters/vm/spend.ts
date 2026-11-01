// «Spend & invest» оригинала (openShop, game.en.js 208723-208891), разделённый
// между вкладками Activities и Money. Только чтение: функции и тексты оригинала
// (shopItems, shopTop, shopSets, invOK, INV_KS, wonStr, словарь L). Выполняется в
// песочнице useCoreView: shopItems() разыгрывает варианты хобби — здесь это не
// затрагивает игровой поток. Покупка — команда buy на настоящем S.
import type { Top } from '../commands';
import { plain } from '../text.ts';

export type SpendTab = 'activities' | 'money';

export type SpendOption = { key: string; name: string; price: string; credit: boolean; avail: boolean; confirm: string | null };
export type SpendItem = {
  id: string;
  key: string | null; // ключ покупки, если у пункта нет вариантов
  name: string;
  desc: string;
  why: string; // причина недоступности (текст оригинала)
  price: string; // «$500», «+$1,200» (продажа) или пусто (бесплатно)
  credit: boolean; // покупка в долг
  avail: boolean;
  confirm: string | null; // текст подтверждения для рискованных действий (SHOP_ASK)
  options: SpendOption[];
  top: boolean; // «Worth doing now» (shopTop)
};
export type Choice = { value: string; label: string };
export type SpendSetting = { id: 'invest' | 'gift' | 'surname' | 'insurance' | 'diet'; title: string; value: string; options: Choice[]; note: string; disabled?: boolean };
export type SpendHabit = { id: string; name: string; on: boolean; note: string };

export type SpendView = {
  available: boolean; // shopCan(): жизнь идёт и есть фокусы (с 6 лет)
  title: string; // «Spend & invest»
  head: string; // «Money saved: $X» / «Debt: $X»
  income: string;
  labels: { worthNow: string; more: string; ways: string; onItsOwn: string; habitsNote: string; credit: string };
  items: SpendItem[];
  settings: SpendSetting[];
  habits: SpendHabit[];
};

// Распределение пунктов SHOP по вкладкам (docs/screen-map.md).
const MONEY_IDS = new Set([
  'sellcar', 'sellmoto', 'sellhouse', 'smaller', 'bigger', 'remodel', 'rental', 'bizsell', 'bizclose',
  'parents', 'kidmoney', 'donate', 'askkids', 'remitstop', 'remitagain', 'hschagain', 'hschend', 'lottostop',
]);
const MONEY_HABITS = new Set(['parentsauto', 'kidmoneyauto', 'donateauto']);
export const spendTabOf = (id: string): SpendTab => (id.startsWith('own_') || MONEY_IDS.has(id.split('@')[0]!) ? 'money' : 'activities');

/** Перевод шаблона L оригинала по его корейскому тексту (тот же ключ словаря). */
const tl = (T: Top, ...parts: string[]) => (args: unknown[] = []) => plain(T.L(Object.assign([...parts], { raw: [...parts] }), ...args));

const INV_LABEL: Record<string, string> = {
  cash: '예금 · 물가 빼고 연 1~1.5%',
  bond: '채권 · 평균 2% 안팎, 출렁임 작음',
  mix: '주식·채권 반반 펀드 · 평균 3.5%, 출렁임 중간',
  stock: '주식 (지수) · 평균 5%, 출렁임 큼',
  world: '해외 지수 (세계 주식) · 평균 5%, 환율 따라서도 출렁여요',
  property: '부동산 펀드 · 평균 3.5%',
  trade: '직접 종목 골라 사고팔기 · 대부분 지수보다 못 벌어요',
};

export function spendView(T: Top, tab: SpendTab): SpendView | null {
  const S = T.S;
  if (!S || S.phase !== 'life') return null;
  const L1 = (s: string) => tl(T, s)();
  const available = !!T.shopCan();
  const confirmOf = (key: string): string | null => {
    const kind = T.SHOP_ASK.get(key);
    return kind ? plain(T.SHOP_ASK_T[kind]()) : null;
  };
  const priceOf = (x: { gain: number | null; price: number }) => (x.gain != null ? '+' + plain(T.wonStr(x.gain)) : x.price > 0 ? plain(T.wonStr(x.price)) : '');

  const items: SpendItem[] = [];
  if (available) {
    const all = T.shopItems() as Record<string, any>[];
    const top = new Set((T.shopTop(all) as Record<string, any>[]).map(x => x.id));
    for (const it of all) {
      if (spendTabOf(it.id) !== tab) continue;
      const opts: SpendOption[] = (it.opts || []).map((o: Record<string, any>) => ({
        key: o.id, name: plain(T.capS(o.n)), price: priceOf(o as { gain: number | null; price: number }), credit: !!o.credit, avail: !!o.avail, confirm: confirmOf(o.id),
      }));
      items.push({
        id: it.id, key: it.opts ? null : it.id, name: plain(T.capS(it.n)), desc: plain(it.d), why: it.avail ? '' : plain(it.why),
        price: it.opts ? '' : priceOf(it as { gain: number | null; price: number }), credit: !!it.credit, avail: !!it.avail,
        confirm: it.opts ? null : confirmOf(it.id), options: opts, top: top.has(it.id),
      });
    }
  }

  const settings: SpendSetting[] = [];
  const adult = S.age >= 18;
  const young = S.age < 15;
  const dd = typeof T.ddLv === 'function' && S.age >= 16 && T.ddLv() >= 2 ? T.ddLv() : 0;
  if (tab === 'money') {
    if (!dd && !young) {
      const cur = S.invest || 'cash';
      const ks = (T.INV_KS as string[]).filter(k => T.invOK(k));
      settings.push({
        id: 'invest', title: L1('여유 자금 굴리기'), value: cur,
        options: ks.map(k => ({ value: k, label: L1(INV_LABEL[k] ?? k) })),
        note: (S.invest && S.invest !== 'cash' ? plain(T.invCostNote()) + ' ' : '') + L1("모은 돈을 어디에 맡겨 둘지 고르는 곳이에요. 고르지 않으면 예금에 둡니다. 수익률은 모두 물가를 뺀 값이에요. 부동산 펀드는 내 집과 따로이고, 내 집은 '내 집 마련', 세 놓을 집은 '세 놓을 집'에서 사요."),
      });
    }
    if (dd < 3 && adult) {
      settings.push({
        id: 'gift', title: L1('경조사비'), value: S.flags.gift || 'full',
        options: [{ value: 'full', label: L1('정성껏 낸다') }, { value: 'some', label: L1('형편껏 절반만') }, { value: 'none', label: L1('마음만 전한다') }],
        note: L1('친구 결혼식과 친척 장례에 내는 돈이에요. 덜 내면 돈은 아끼지만, 사이가 조금 덜 가까워질 수 있어요.'),
      });
    }
    if (dd < 3 && T.surOK()) {
      settings.push({
        id: 'surname', title: L1('아이 성'), value: S.flags.surM && S.flags.surM === S.fam.marriages ? 'm' : 'f',
        options: [{ value: 'f', label: L1('아버지 성을 따른다') }, { value: 'm', label: L1('어머니 성을 따른다') }],
        note: T.surFixed() ? L1('첫아이 때 정한 성을 다른 아이도 따라요.') : '', disabled: !!T.surFixed(),
      });
    }
    if (dd < 3 && adult) {
      settings.push({
        id: 'insurance', title: L1('보험'), value: T.insOn() ? 'more' : 'base',
        options: [{ value: 'base', label: L1('기본 보장만') }, { value: 'more', label: L1('보험을 넉넉히 든다') }],
        note: '',
      });
    }
  } else if (adult) {
    settings.push({
      id: 'diet', title: L1('식습관'), value: S.flags.diet || 'usual',
      options: [{ value: 'usual', label: L1('주변 사람들처럼 먹기') }, { value: 'good', label: L1('싱겁게, 채소·잡곡 챙겨 먹기') }, { value: 'out', label: L1('외식·배달이 잦은 편') }],
      note: L1('챙겨 먹으면 장보기에 돈이 조금 더 들지만, 혈압·당뇨 같은 병이 덜 생겨요. 외식과 배달은 편하지만 돈이 더 들고 병이 조금 더 생겨요.'),
    });
  }

  const habits: SpendHabit[] = (T.shopSets() as Record<string, any>[])
    .filter(h => (tab === 'money') === MONEY_HABITS.has(h.id))
    .map(h => ({ id: h.id, name: plain(h.n), on: !!h.on, note: plain(h.ev) }));

  return {
    available,
    title: L1('돈 쓰기 · 투자'),
    head: S.money < 0 ? plain(tl(T, '빚 ', '')([T.wonStr(-S.money)])) : plain(tl(T, '모은 돈 ', '')([T.wonStr(S.money)])),
    income: S.income > 0 ? plain(T.wonStr(S.income)) : '',
    labels: {
      worthNow: L1('지금 할 만한 것'), more: tl(T, '다른 것 더 보기 (', ')')([items.filter(i => !i.top).length]), ways: L1('생활 방식'), onItsOwn: L1('알아서 하기'),
      habitsNote: L1('켜 두면 때가 될 때마다 알아서 해요. 돈이 드는 일은 모아 둔 돈이 비용의 세 배를 넘을 때만 해요. 다시 누르면 꺼져요.'),
      credit: L1('빚을 내서'),
    },
    items,
    settings,
    habits,
  };
}

/** Текущие настройки следующей жизни (UI.prefs оригинала) и подписи. */
export type LifePrefsView = { mode: 'birth' | 'pop'; era: 'now' | 'past' | 'future' | 'any'; eraYear: 'r' | number; yearMin: number; yearMax: number; pace: number };
export function lifePrefsView(T: Top): LifePrefsView {
  const p = T.UI.prefs;
  return {
    mode: p.mode === 'pop' ? 'pop' : 'birth',
    era: p.eraAny ? 'any' : p.era === 'past' || p.era === 'future' ? p.era : 'now',
    eraYear: p.eraY === 'r' ? 'r' : Number(p.eraY) || T.ERA_Y_DEF,
    yearMin: T.ERA_Y0,
    yearMax: T.ERA_PAST1,
    pace: Number(p.pace) || 60,
  };
}
