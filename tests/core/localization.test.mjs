import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { loadDerivedModules, createOriginalRuntime, createDerivedRuntime } from '../../tools/harness/runtimes.mjs';
import { drive, SCENARIOS, SNAPSHOT, CLOCK } from '../../tools/harness/scenarios.mjs';
import { createHost, sharedSaveKey } from '../../src/core/runtime.ts';
import { memoryStorage } from '../../src/core/env.ts';
import { GameAdapter } from '../../src/adapters/gameAdapter.ts';
import { endSummary } from '../../src/adapters/vm/end.ts';

const locales = ['en', 'ru', 'es', 'fr', 'de'];
const modules = new Map();
before(async () => { for (const lang of locales) modules.set(lang, await loadDerivedModules(lang)); });

for (const lang of locales) test(`${lang}: полная жизнь соответствует неизменённой сборке своего языка`, () => {
  const original = createOriginalRuntime({ clockAt: CLOCK, lang });
  const derived = createDerivedRuntime({ clockAt: CLOCK, lang });
  assert.equal(derived.get('LANG'), lang);
  const trace = [];
  drive(original, SCENARIOS[0], (i, label) => trace.push([i, label, original.eval(SNAPSHOT)]));
  let cursor = 0;
  drive(derived, SCENARIOS[0], (i, label) => {
    const expected = trace[cursor++];
    assert.equal(label, expected[1]);
    assert.equal(derived.eval(SNAPSHOT), expected[2], `${lang}, шаг ${i}: ${label}`);
  });
  assert.equal(cursor, trace.length);
  assert.equal(derived.get('S').phase, 'dead');
  assert.ok(derived.get('S').log.some(e => e.text));
  assert.deepEqual(original.network, []);
  assert.deepEqual(derived.network, []);
  const summary = endSummary(derived.core.top);
  assert.ok(summary?.story, `${lang}: история жизни переведена`);
  assert.ok(summary?.ending.causeLabel, `${lang}: подпись причины смерти`);
  assert.deepEqual(derived.consoleErrors, []);
});

const clock = { now: () => CLOCK, monotonic: () => 0 };
function host(storage, lang) {
  const mods = modules.get(lang);
  return createHost(mods.derivedModule, { storage, lang, seed: 'locale-switch', clock, viewRandom: () => 0.123, loadEra: async () => mods.eraModule.ERA });
}

test('смена языка: жизнь, RNG, свидетельство, мета-валюты и архив остаются общими; перезагрузка продолжает жизнь', async () => {
  const storage = memoryStorage();
  const a = new GameAdapter({ paceChoices: [10, 30], defaultPace: 30 });
  await a.boot(async () => host(storage, 'en'));
  assert.equal(await a.startLife('start', 0), true);
  for (let i = 0; i < 2000 && !a.getSnapshot().companionsReady; i++) await new Promise(r => setTimeout(r, 1));
  assert.ok(a.getSnapshot().companionsReady);
  assert.equal(a.revealCertificate('certificate'), true);
  assert.equal(a.beginLife('begin'), true);
  const first = a['host'];
  first.top.lsSet(first.top.LIVES_KEY, [{ at: CLOCK - 1000, iso: 'CAN', name: 'Saved life', age: 90 }]);
  const before = structuredClone(first.top.S);
  const entropy = first.entropy.getState();
  const rnd = first.top.RND_N;
  const certificate = a['certNo'];
  const meta = a.getSnapshot().meta;
  for (const lang of ['ru', 'es', 'fr', 'de', 'en']) {
    const options = a.currencies(lang);
    assert.ok(options.length > 0, `${lang}: выбор валют`);
    const key = options.find(c => c.current)?.key ?? options[0].key;
    assert.equal(await a.setLanguageCurrency(`switch-${lang}`, lang, key, async () => host(storage, lang)), true);
    const current = a['host'];
    assert.equal(current.top.LANG, lang);
    assert.equal(current.entropy.getState(), entropy, `${lang}: RNG не сдвинут`);
    assert.equal(current.top.RND_N, rnd);
    const expected = { ...before, paused: true, ff: false };
    assert.deepEqual(current.top.S, expected, `${lang}: персонаж не изменился`);
    assert.equal(a['certNo'], certificate);
    assert.equal(a.getSnapshot().certificate.month, new Intl.DateTimeFormat(current.top.LC.loc, { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2000, before.bm - 1, 1))));
    assert.equal(a.getSnapshot().meta.energy, meta.energy);
    assert.equal(a.getSnapshot().meta.dollars, meta.dollars);
    assert.equal(a.getSnapshot().pastLives.length, 1);
    assert.equal(a.currencyKey(), key);
    assert.deepEqual(current.errors, []);
    current.top.save();
  }
  const reloaded = new GameAdapter();
  await reloaded.boot(async () => host(storage, 'ru'));
  assert.equal(reloaded.getSnapshot().status, 'ready');
  assert.equal(reloaded.getSnapshot().lifePhase, 'life');
  assert.equal(reloaded.getSnapshot().life.name, before.name.full);
  assert.equal(reloaded.getSnapshot().pastLives.length, 1);
  assert.equal(reloaded.getSnapshot().meta.energy, meta.energy);
  assert.equal(reloaded['host'].entropy.getState(), entropy);
});

test('ошибка загрузки языка оставляет прежний core и выбор валюты', async () => {
  const storage = memoryStorage();
  const a = new GameAdapter();
  await a.boot(async () => host(storage, 'en'));
  const initial = a['host'];
  const previous = initial.storage.getItem('one8b.cur.ru');
  const quiet = console.error;
  console.error = () => {};
  try {
    assert.equal(await a.setLanguageCurrency('broken-load', 'ru', 'RUB', async () => { throw new Error('offline'); }), false);
  } finally { console.error = quiet; }
  assert.equal(a['host'], initial);
  assert.equal(a.getSnapshot().status, 'ready');
  assert.equal(initial.storage.getItem('one8b.cur.ru'), previous);
  assert.equal(await a.setLanguageCurrency('invalid', 'ar', 'USD', async () => { throw new Error('must not load'); }), false);
  assert.equal(sharedSaveKey('one8b.ru.save.v3'), 'one8b.en.save.v3');
  assert.equal(sharedSaveKey('one8b.cur.ru'), 'one8b.cur.ru');
});

test('журнал новой жизни на русском воспроизводится своей языковой сборкой', async () => {
  const { replayLife } = await import('../../tools/harness/replay.mjs');
  const storage = memoryStorage();
  const a = new GameAdapter();
  await a.boot(async () => host(storage, 'ru'));
  await a.startLife('ru-start', 0);
  for (let i = 0; i < 2000 && !a.getSnapshot().companionsReady; i++) await new Promise(r => setTimeout(r, 1));
  assert.equal(a.revealCertificate('ru-cert'), true);
  assert.equal(a.beginLife('ru-begin'), true);
  const replayed = await replayLife(a.exportReplay());
  assert.equal(replayed['host'].top.LANG, 'ru');
  assert.deepEqual(replayed['host'].top.S, a['host'].top.S);
});
