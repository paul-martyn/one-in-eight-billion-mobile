import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { loadDerivedModules } from '../../tools/harness/runtimes.mjs';
import { createHost, sharedSaveKey } from '../../src/core/runtime.ts';
import { memoryStorage } from '../../src/core/env.ts';
import { GameAdapter } from '../../src/adapters/gameAdapter.ts';

const locales = ['en', 'ru', 'es', 'fr', 'de'];
const modules = new Map();
before(async () => { for (const lang of locales) modules.set(lang, await loadDerivedModules(lang)); });
const CLOCK = Date.parse('2026-10-27T12:00:00.000Z');
const clock = { now: () => CLOCK, monotonic: () => 0 };
function host(storage, lang, seed = 'locale-switch') {
  const mods = modules.get(lang);
  return createHost(mods.derivedModule, { storage, lang, seed, clock, viewRandom: () => 0.123, loadEra: async () => mods.eraModule.ERA });
}
async function companions(adapter) {
  for (let i = 0; i < 2000 && !adapter.getSnapshot().companionsReady; i++) await new Promise(r => setTimeout(r, 1));
  assert.ok(adapter.getSnapshot().companionsReady, 'four companion lives completed');
}

for (const lang of locales) test(`${lang}: birth, certificate, life, death, rewards and next life are local`, async () => {
  const storage = memoryStorage();
  const h = host(storage, lang, `standalone-${lang}`);
  const a = new GameAdapter();
  await a.boot(async () => h);
  assert.equal(h.top.S, null, 'no legacy page starts a life');
  assert.equal(h.timers.pending, 0, 'no background boot timers');
  assert.equal(await a.startLife(`${lang}-birth`, 0), true);
  await companions(a);
  assert.equal(a.revealCertificate(`${lang}-certificate`), true);
  const cert = a.getSnapshot().certificate;
  assert.ok(cert?.name && cert.country && cert.companions.length === 4);
  assert.equal(a.beginLife(`${lang}-begin`), true);
  assert.equal(await a.skipToEnd(`${lang}-end`), true);
  const dead = a.getSnapshot();
  assert.equal(dead.lifePhase, 'dead');
  assert.ok(dead.ended?.story.length > 20 && dead.ended.lives.length === 5);
  assert.equal(dead.pastLives.length, 1);
  const savedLife = JSON.stringify(h.top.S);
  assert.equal(a.claimReward(`${lang}-claim`), true);
  assert.equal(JSON.stringify(h.top.S), savedLife, 'reward does not change the ended simulation');
  const reloaded = new GameAdapter();
  const h2 = host(storage, lang, 'seed-unused-after-reload');
  await reloaded.boot(async () => h2);
  assert.equal(reloaded.getSnapshot().pastLives.length, 1);
  assert.equal(reloaded.getSnapshot().meta.dollars, a.getSnapshot().meta.dollars);
  assert.equal(await reloaded.startLife(`${lang}-second-birth`, reloaded.getSnapshot().lifeSeq), true);
  await companions(reloaded);
  assert.equal(reloaded.getSnapshot().lifePhase, 'birth');
  assert.equal(reloaded.getSnapshot().pastLives.length, 1);
  assert.deepEqual(h.network, []);
  assert.deepEqual(h2.network, []);
  assert.deepEqual(h.errors, []);
  assert.deepEqual(h2.errors, []);
});

test('switching language keeps life, RNG, certificate, currency and history; reload resumes', async () => {
  const storage = memoryStorage();
  const a = new GameAdapter({ paceChoices: [10, 30], defaultPace: 30 });
  await a.boot(async () => host(storage, 'en'));
  assert.equal(await a.startLife('start', 0), true);
  await companions(a);
  assert.equal(a.revealCertificate('certificate'), true);
  assert.equal(a.beginLife('begin'), true);
  const first = a['host'];
  first.top.lsSet(first.top.LIVES_KEY, [{ at: CLOCK - 1000, iso: 'CAN', name: 'Saved life', age: 90 }]);
  const before = structuredClone(first.top.S), entropy = first.entropy.getState(), rnd = first.top.RND_N;
  const certificate = a['certNo'], meta = a.getSnapshot().meta;
  for (const lang of ['ru', 'es', 'fr', 'de', 'en']) {
    const options = a.currencies(lang);
    assert.ok(options.length > 0);
    const key = options.find(c => c.current)?.key ?? options[0].key;
    assert.equal(await a.setLanguageCurrency(`switch-${lang}`, lang, key, async () => host(storage, lang)), true);
    const current = a['host'];
    assert.equal(current.top.LANG, lang);
    assert.equal(current.entropy.getState(), entropy);
    assert.equal(current.top.RND_N, rnd);
    assert.deepEqual(current.top.S, { ...before, paused: true, ff: false });
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

test('failed language load keeps previous host and currency', async () => {
  const storage = memoryStorage(), a = new GameAdapter();
  await a.boot(async () => host(storage, 'en'));
  const initial = a['host'], previous = initial.storage.getItem('one8b.cur.ru');
  const quiet = console.error;
  console.error = () => {};
  try { assert.equal(await a.setLanguageCurrency('broken-load', 'ru', 'RUB', async () => { throw new Error('offline'); }), false); }
  finally { console.error = quiet; }
  assert.equal(a['host'], initial);
  assert.equal(initial.storage.getItem('one8b.cur.ru'), previous);
  assert.equal(await a.setLanguageCurrency('invalid', 'ar', 'USD', async () => { throw new Error('must not load'); }), false);
  assert.equal(sharedSaveKey('one8b.ru.save.v3'), 'one8b.en.save.v3');
  assert.equal(sharedSaveKey('one8b.cur.ru'), 'one8b.cur.ru');
});

test('a Russian replay uses its own engine locale', async () => {
  const { replayLife } = await import('../../tools/harness/replay.mjs');
  const a = new GameAdapter();
  await a.boot(async () => host(memoryStorage(), 'ru'));
  await a.startLife('ru-start', 0);
  await companions(a);
  assert.equal(a.revealCertificate('ru-cert'), true);
  assert.equal(a.beginLife('ru-begin'), true);
  const replayed = await replayLife(a.exportReplay());
  assert.equal(replayed['host'].top.LANG, 'ru');
  assert.deepEqual(replayed['host'].top.S, a['host'].top.S);
});
