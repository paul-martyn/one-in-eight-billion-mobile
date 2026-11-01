// Сценарии сравнения оригинала и производного core.
// Шаги — выражения на языке исходной игры; одна и та же строка исполняется
// в обеих средах, поэтому сценарий не может «подыграть» одной из них.

export const CLOCK = Date.parse('2026-10-27T12:00:00.000Z');

/** Наблюдатели HOOK: ничего не подавляют молча, ошибки собираются и проверяются. */
export const HOOK_RECORDERS = `(() => {
  globalThis.__events = [];
  globalThis.__errors = [];
  for (const k of ['log', 'change', 'decision', 'death', 'year']) HOOK[k] = e => { __events.push(k); };
  HOOK.err = e => { __errors.push(String(e && e.stack || e)); };
  return true;
})()`;

/** Варианты выбора: оригинальный автовыбор или детерминированная стратегия по порядку вариантов. */
export const POLICIES = {
  auto: 'choose(autoChoice(S.pending))',
  first: 'choose(S.pending.view.choices[0].k)',
  last: 'choose(S.pending.view.choices[S.pending.view.choices.length - 1].k)',
  // Индекс зависит только от уже принятых решений, а не от RNG игры.
  rotate: 'choose(S.pending.view.choices[S.stats.decisions % S.pending.view.choices.length].k)',
};

export const SCENARIOS = [
  { id: 'can-f-auto', seed: 'eq-can-f', country: 'CAN', opts: '{sex:"F"}', policy: 'auto' },
  { id: 'ind-m-first', seed: 'eq-ind-m', country: 'IND', opts: '{sex:"M"}', policy: 'first' },
  { id: 'nga-f-last', seed: 'eq-nga-f', country: 'NGA', opts: '{sex:"F"}', policy: 'last' },
  { id: 'usa-m-rotate', seed: 'eq-usa-m', country: 'USA', opts: '{sex:"M"}', policy: 'rotate' },
  { id: 'kor-m-auto', seed: 'eq-kor-m', country: 'KOR', opts: '{sex:"M"}', policy: 'auto' },
  { id: 'chn-f-rotate', seed: 'eq-chn-f', country: 'CHN', opts: '{sex:"F"}', policy: 'rotate' },
  { id: 'bra-m-last', seed: 'eq-bra-m', country: 'BRA', opts: '{sex:"M"}', policy: 'last' },
  { id: 'rus-f-first', seed: 'eq-rus-f', country: 'RUS', opts: '{sex:"F"}', policy: 'first' },
  { id: 'random-country-auto', seed: 'eq-random', country: 'null', opts: 'null', policy: 'auto' },
  { id: 'past-1950-auto', seed: 'eq-past', country: 'null', opts: '{era:"past", by:1950}', policy: 'auto', era: true },
  { id: 'future-2045-rotate', seed: 'eq-future', country: 'null', opts: '{era:"future", by:2045}', policy: 'rotate', era: true },
];

/** Снимок для сравнения: полное S, счётчик RNG и наблюдения HOOK. */
export const SNAPSHOT = 'JSON.stringify({ S, rnd: RND_N, ev: __events.length, err: __errors })';

/**
 * Прогон одного сценария по шагам. `onStep(i, label)` вызывается после каждой команды.
 * Возвращает число команд.
 */
export function drive(runtime, sc, onStep, { maxSteps = 20000, tickDiv = 3, snapshotEvery = 1 } = {}) {
  const ev = code => runtime.eval(code);
  ev(HOOK_RECORDERS);
  ev(`setRng(seedRng(${JSON.stringify(sc.seed)}))`);
  ev(`newLife('birth', 60, ${sc.country === 'null' ? 'null' : JSON.stringify(sc.country)}, ${sc.opts})`);
  onStep(0, 'newLife');
  ev(`S.phase = 'life'`);
  let i = 1;
  for (; i < maxSteps && ev(`S.phase === 'life'`); i++) {
    if (ev('!!S.pending')) {
      ev(POLICIES[sc.policy]);
      onStep(i, 'choose');
    } else {
      ev(`tick(S.yearSec / ${tickDiv})`);
      if (i % snapshotEvery === 0) onStep(i, 'tick');
    }
  }
  onStep(i, 'end');
  return i;
}
