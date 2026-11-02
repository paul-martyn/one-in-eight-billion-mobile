import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { loadDerivedModules } from '../../tools/harness/runtimes.mjs';
import { createHost, STORAGE_PREFIX } from '../../src/core/runtime.ts';
import { memoryStorage } from '../../src/core/env.ts';
import { GameAdapter, STEP_SECONDS } from '../../src/adapters/gameAdapter.ts';
import * as commands from '../../src/adapters/commands.ts';

const CLOCK = Date.parse('2026-10-27T12:00:00.000Z');
const modules = new Map();
before(async () => { for (const lang of ['en', 'ru']) modules.set(lang, await loadDerivedModules(lang)); });
let sequence = 0;
const id = () => `era-restore-${++sequence}`;

function newHost(storage, lang = 'en', loadEra) {
  const mod = modules.get(lang);
  return createHost(mod.derivedModule, {
    storage, lang, seed: 'era-save-fixture', viewRandom: () => 0.123,
    clock: { now: () => CLOCK, monotonic: () => 0 },
    loadEra: loadEra ?? (async () => mod.eraModule.ERA),
  });
}

function demographics(host) {
  const T = host.top;
  const extract = country => ({ id: country.id, year: country.yr, ppp: country.ppp, le: country.le });
  return { current: extract(T.C()), birth: extract(T.BB()) };
}

async function savedLife(era, by) {
  const storage = memoryStorage(), host = newHost(storage), adapter = new GameAdapter();
  await adapter.boot(async () => host);
  await host.top.eraLoad();
  const T = host.top;
  T.newLife('birth', 60, 'CAN', { era, by, sex: 'F' });
  // Future mode starts in the current year, then projects the subsequent life.
  const birthYear = era === 'future' ? T.NOW_Y : by;
  const saveAge = era === 'future' ? by - birthYear : 2;
  commands.revealCertificate(T);
  commands.beginLife(T, CLOCK);
  // A real initialized life, including render state effects, not a fabricated S.
  assert.equal(adapter.setSpeed(id(), 8), true);
  for (let step = 0; step < 10000 && T.S.phase === 'life' && T.S.age < saveAge; step++) {
    if (T.S.pending) {
      assert.equal(adapter.choose(id(), T.S.pending.id, T.S.pending.view.choices[0].k), true);
      adapter.dismissLastChoice();
    } else adapter.advance(STEP_SECONDS);
  }
  assert.equal(T.S.phase, 'life');
  assert.equal(T.S.age, saveAge);
  assert.equal(T.S.born, 'CAN');
  assert.equal(T.S.by, birthYear);
  assert.equal(T.S.era, era);
  const expected = demographics(host);
  assert.equal(expected.current.year, birthYear + T.S.age);
  assert.equal(expected.birth.year, birthYear);
  assert.notEqual(expected.current.ppp, T.CBY.CAN.ppp, 'ERA purchasing power differs from the present country table');
  assert.notEqual(expected.current.le, T.CBY.CAN.le, 'ERA life expectancy differs from the present country table');
  if (era === 'past') assert.notEqual(expected.birth.le, T.CBY.CAN.le);
  // Restore deliberately removes fast-forward and pauses; other fields must survive.
  T.S.ff = true;
  T.S.paused = false;
  T.save();
  return { entries: Object.entries(storage.dump()), expected, original: adapter };
}

async function preparedControl(entries, lang = 'en', currency = null) {
  const storage = memoryStorage(entries);
  if (currency) storage.setItem(`${STORAGE_PREFIX}one8b.cur.${lang}`, currency);
  const host = newHost(storage, lang);
  // This is the intended ordering: local era data ready before restore/render.
  await host.top.eraLoad();
  const adapter = new GameAdapter();
  await adapter.boot(async () => host);
  return { host, adapter };
}

function assertRestored(candidate, control, expected) {
  const host = candidate['host'];
  assert.equal(candidate.getSnapshot().status, 'ready');
  assert.equal(candidate.getSnapshot().lifePhase, 'life');
  assert.equal(host.top.S.paused, true);
  assert.equal(host.top.S.ff, false);
  assert.deepEqual(demographics(host), expected, 'current and birth country keep historical/future year, PPP and life expectancy');
  assert.deepEqual(host.top.S, control['host'].top.S, 'restore changes only the established pause/fast-forward semantics');
  assert.equal(host.entropy.getState(), control['host'].entropy.getState(), 'restoration keeps the game random stream');
}

function compareContinuation(control, candidate) {
  const controlHost = control['host'], candidateHost = candidate['host'];
  const controlRnd = controlHost.top.RND_N, candidateRnd = candidateHost.top.RND_N;
  const targetAge = controlHost.top.S.age + 3;
  assert.equal(control.setPaused(id(), false), true);
  assert.equal(candidate.setPaused(id(), false), true);
  let decisions = 0, steps = 0;
  for (; steps < 10000 && controlHost.top.S.phase === 'life' && controlHost.top.S.age < targetAge; steps++) {
    const pending = controlHost.top.S.pending;
    if (pending) {
      const key = pending.view.choices[0].k;
      assert.equal(control.choose(id(), pending.id, key), true);
      assert.equal(candidate.choose(id(), pending.id, key), true);
      control.dismissLastChoice(); candidate.dismissLastChoice();
      decisions++;
    } else {
      control.advance(STEP_SECONDS); candidate.advance(STEP_SECONDS);
    }
    assert.deepEqual(candidateHost.top.S, controlHost.top.S, `same state after continuation command ${steps}`);
    assert.equal(candidateHost.entropy.getState(), controlHost.entropy.getState(), `same random stream after command ${steps}`);
    // Absolute RND_N resets on a cold instance; the draws made after restore must match.
    assert.equal(candidateHost.top.RND_N - candidateRnd, controlHost.top.RND_N - controlRnd, `same draw count after command ${steps}`);
  }
  assert.ok(steps > 0);
  assert.ok(controlHost.top.S.age >= targetAge || controlHost.top.S.phase === 'dead');
  assert.deepEqual(candidateHost.errors, []);
  assert.deepEqual(controlHost.errors, []);
  assert.deepEqual(candidateHost.network, []);
  return { steps, decisions };
}

for (const { era, by } of [{ era: 'past', by: 1950 }, { era: 'future', by: 2045 }]) {
  test(`CAN ${by}: saved-life boot waits for local ERA before country calculations`, async () => {
    const saved = await savedLife(era, by);
    const control = saved.original;
    assert.equal(control.setPaused(id(), true), true);
    const host = newHost(memoryStorage(saved.entries)), candidate = new GameAdapter();
    assert.equal(host.top.eraLoaded(), false, 'new browser host starts without the optional table');
    await candidate.boot(async () => host);
    assertRestored(candidate, control, saved.expected);
    compareContinuation(control, candidate);
  });

  test(`CAN ${by}: currency reload keeps era demographics and subsequent S/RNG`, async () => {
    const saved = await savedLife(era, by);
    const { adapter: control } = await preparedControl(saved.entries, 'en', 'GBP');
    // Currency is written by the adapter to its own base; use that same base on reload.
    const sourceBase = memoryStorage(saved.entries);
    const live = newHost(sourceBase);
    await live.top.eraLoad();
    const changing = new GameAdapter();
    await changing.boot(async () => live);
    let next;
    assert.equal(await changing.setCurrency(id(), 'GBP', async () => (next = newHost(sourceBase))), true);
    assert.equal(next.top.CUR, 'GBP');
    assertRestored(changing, control, saved.expected);
    compareContinuation(control, changing);
  });

  test(`CAN ${by}: locale swap loads local ERA before any target-language view`, async () => {
    const saved = await savedLife(era, by);
    const { adapter: control } = await preparedControl(saved.entries, 'ru', 'RUB');
    const base = memoryStorage(saved.entries), source = newHost(base);
    await source.top.eraLoad();
    const candidate = new GameAdapter();
    await candidate.boot(async () => source);
    let next;
    assert.equal(await candidate.setLanguageCurrency(id(), 'ru', 'RUB', async () => (next = newHost(base, 'ru'))), true);
    assert.equal(next.top.LANG, 'ru');
    assertRestored(candidate, control, saved.expected);
    compareContinuation(control, candidate);
  });
}
