// «Spend & invest» через адаптер: покупки и настройки жизни из вкладок Activities
// и Money не ломают core, дают строки результата (lastSpend) и воспроизводятся
// журналом команд так же, как фокус, скорость и решения.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { loadDerivedModules } from '../../tools/harness/runtimes.mjs';
import { createHost } from '../../src/core/runtime.ts';
import { memoryStorage } from '../../src/core/env.ts';
import { GameAdapter, STEP_SECONDS } from '../../src/adapters/gameAdapter.ts';
import { spendView } from '../../src/adapters/vm/spend.ts';

let mods;
before(async () => { mods = await loadDerivedModules(); });

const CLOCK = Date.parse('2026-11-01T09:30:00.000Z');
let idn = 0;
const id = () => `s${++idn}`;

const waitFor = async (pred, label) => {
  for (let i = 0; i < 2000 && !pred(); i++) await new Promise(r => setTimeout(r, 1));
  assert.ok(pred(), label);
};

/** Ключ первой доступной покупки вкладки: сам пункт или его первый доступный вариант. */
function firstBuyable(view) {
  for (const it of view.items) {
    if (!it.avail) continue;
    if (it.key) return it.key;
    const o = it.options.find(x => x.avail);
    if (o) return o.key;
  }
  return null;
}

test('покупки и настройки «Spend & invest» через адаптер воспроизводятся журналом', async () => {
  const { replayLife, stateHash } = await import('../../tools/harness/replay.mjs');
  const a = new GameAdapter();
  await a.boot(async () => createHost(mods.derivedModule, {
    storage: memoryStorage(), seed: 'spend-life', clock: { now: () => CLOCK, monotonic: () => 0 }, viewRandom: () => 0.37,
    loadEra: async () => mods.eraModule.ERA,
  }));
  assert.equal(await a.startLife(id(), 0), true);
  await waitFor(() => a.getSnapshot().companionsReady, 'сопутствующие жизни готовы');
  assert.equal(a.revealCertificate(id()), true);
  assert.equal(a.beginLife(id()), true);

  const bought = [];
  let tried = 0;
  let habitDone = false, investDone = false, dietDone = false;
  let lastShopAge = -1;
  let k = 0;
  for (let i = 0; i < 600000 && a.getSnapshot().lifePhase === 'life'; i++) {
    const T = a['host'].top;
    if (T.S.pending) {
      const ch = T.S.pending.view.choices;
      assert.equal(a.choose(id(), T.S.pending.id, ch[k++ % ch.length].k), true);
      continue;
    }
    // С 18 лет раз в три года игрок заходит в Activities и Money.
    if (T.S.age >= 18 && T.S.age % 3 === 0 && T.S.age !== lastShopAge) {
      lastShopAge = T.S.age;
      assert.equal(a.openSpend(id()), true, 'вход во вкладку');
      for (const tab of ['activities', 'money']) {
        const view = a.view(t => spendView(t, tab));
        assert.ok(view, `spendView(${tab}) в ${T.S.age} лет`);
        if (!view.available) continue;
        const key = firstBuyable(view);
        if (key) {
          tried++;
          const ok = a.buy(id(), key);
          const ls = a.getSnapshot().lastSpend;
          if (ok) {
            assert.ok(ls && ls.key === key, `lastSpend для ${key}`);
            assert.ok(ls.entries.length >= 1 && ls.entries.every(e => typeof e.text === 'string' && e.text.length > 0), `строки результата для ${key}`);
            bought.push({ tab, key, age: T.S.age });
            a.dismissLastSpend();
            assert.equal(a.getSnapshot().lastSpend, null);
          } else {
            assert.equal(ls, null, `неудачная покупка ${key} не даёт lastSpend`);
          }
        }
        if (tab === 'activities') {
          if (!habitDone && view.habits.length) { habitDone = a.toggleHabit(id(), view.habits[0].id); assert.ok(habitDone, 'автопривычка'); }
          if (!dietDone && view.settings.some(s => s.id === 'diet')) { dietDone = a.setDiet(id(), 'good'); assert.ok(dietDone, 'питание'); }
        } else if (!investDone) {
          const inv = view.settings.find(s => s.id === 'invest');
          const next = inv?.options.find(o => o.value !== inv.value);
          if (next) { investDone = a.setInvest(id(), next.value); assert.ok(investDone, 'вложения'); }
        }
      }
    }
    a.advance(STEP_SECONDS);
  }

  const T = a['host'].top;
  assert.equal(a.getSnapshot().lifePhase, 'dead');
  assert.equal(a['host'].errors.length, 0, a['host'].errors.map(e => `${e.source}: ${e.message}`).join('\n'));
  assert.ok(tried > 0, 'были попытки покупки');
  assert.ok(bought.some(b => b.tab === 'activities'), 'есть покупка в Activities');
  assert.ok(bought.some(b => b.tab === 'money'), 'есть покупка в Money');
  assert.ok(habitDone && investDone && dietDone, `привычка ${habitDone}, вложения ${investDone}, питание ${dietDone}`);
  assert.ok((T.S.stats.buys || 0) >= bought.length, 'stats.buys учитывает покупки');

  const replay = a.exportReplay();
  assert.ok(replay);
  const cmds = new Set(replay.commands.map(c => c.cmd));
  for (const c of ['openSpend', 'buy', 'toggleHabit', 'setDiet', 'setInvest']) assert.ok(cmds.has(c), `в журнале есть ${c}`);
  const b = await replayLife(JSON.parse(JSON.stringify(replay)));
  assert.equal(b['host'].errors.length, 0);
  assert.equal(stateHash(b['host'].top.S), stateHash(T.S), 'журнал воспроизводит ту же жизнь');
  assert.equal(b['host'].top.S.phase, 'dead');
  console.log(`spend: ${bought.length}/${tried} покупок (${bought.map(x => x.key).slice(0, 8).join(', ')}…), смерть в ${T.S.age}`);
});
