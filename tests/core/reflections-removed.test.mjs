import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDerivedModules } from '../../tools/harness/runtimes.mjs';
import { createHost, sharedSaveKey } from '../../src/core/runtime.ts';
import { stripLegacyReflections } from '../../src/engine/legacy-reflections.js';

const clockAt = Date.parse('2026-11-16T12:00:00Z');
async function setup(lang) {
  const { derivedModule, eraModule } = await loadDerivedModules(lang);
  const h = createHost(derivedModule, { storage: null, seed: 'removed-reflections', lang,
    viewRandom: () => .5, clock: { now: () => clockAt, monotonic: () => 0 }, loadEra: async () => eraModule.ERA });
  h.top.newLife('birth', 60, 'BLR');
  h.top.S.phase = 'life';
  return h;
}

for (const lang of ['en', 'ru', 'de', 'es', 'fr']) {
  test(`${lang}: reflection ages never schedule a note or accept a removed decision`, async () => {
    const h = await setup(lang), T = h.top;
    assert.equal(T.DEC.reflect, undefined);
    assert.equal(T.crisisNote, undefined);
    assert.equal(T.REFLECT_Q, undefined);
    for (const age of [5, 15, 30, 50, 70]) {
      T.S.age = age;
      T.planYear();
      assert.ok(T.S.queue.every(entry => entry.id !== 'reflect'));
      T.S.pending = null;
      const entropy = h.entropy.getState();
      T.openDecision('reflect', {});
      assert.equal(T.S.pending, null);
      assert.equal(h.entropy.getState(), entropy, 'removed prompt does not consume RNG');
      assert.equal(Object.hasOwn(T.S, 'journal'), false);
    }
    assert.deepEqual(h.errors, []);
  });

  test(`${lang}: an old pending note is removed on restore and never saved again`, async () => {
    const h = await setup(lang), T = h.top;
    const state = JSON.parse(JSON.stringify(T.S));
    state.age = 30;
    state.pending = { id: 'reflect', p: {}, view: { input: true, q: 'old question' } };
    state.queue = [{ at: .5, type: 'dec', id: 'reflect', p: {} }, { at: .7, type: 'dec', id: 'job', p: {} }];
    state.journal = [{ a: 15, q: 'old question', t: 'OLD PRIVATE NOTE' }];
    state.log = [{ a: 15, kind: 'note', text: '“OLD PRIVATE NOTE”', d: 'reflect' }, { a: 16, kind: 'note', text: 'ordinary event' }];
    state.flags.refQ = 'old question';
    state.flags.last_reflect = 15;
    state.done.reflect = 1;
    state.endD = { quote: { t: 'OLD PRIVATE NOTE', a: 15 }, frames: [{ a: 15, note: true, t: 'OLD PRIVATE NOTE' }, { a: 16, note: false, t: 'ordinary event' }] };
    // Bypass the new writer to reproduce an existing installation's old bytes.
    h.storage.setItem(sharedSaveKey(T.lk(T.SAVE_KEY)), JSON.stringify({ S: state, at: clockAt }));
    T.S = T.lsGet(T.SAVE_KEY, null).S;
    assert.equal(T.S.pending, null);
    assert.deepEqual(T.S.queue.map(entry => entry.id), ['job']);
    assert.deepEqual(T.S.log.map(entry => entry.text), ['ordinary event']);
    assert.deepEqual(T.S.endD, { frames: [{ a: 16, t: 'ordinary event' }] });
    assert.equal(T.S.flags.refQ, undefined);
    assert.equal(T.S.done.reflect, undefined);
    T.save();
    assert.doesNotMatch(h.storage.getItem(sharedSaveKey(T.lk(T.SAVE_KEY))), /OLD PRIVATE NOTE|old question|"journal"|"reflect"|"quote"/);
    // Direct archive writes also pass through the migration, independent of restore.
    T.lsSet(T.PAST_KEY, [{ at: clockAt, S: state }]);
    assert.doesNotMatch(h.storage.getItem(sharedSaveKey(T.lk(T.PAST_KEY))), /OLD PRIVATE NOTE|old question|"journal"|"reflect"|"quote"/);
    assert.deepEqual(h.errors, []);
  });
}

test('migration is idempotent and preserves ordinary notes and choices', () => {
  const state = { pending: { id: 'petq' }, queue: [{ id: 'school' }], flags: { last_job: 20 }, done: { job: 1 },
    log: [{ a: 10, kind: 'note', text: 'ordinary note' }, { a: 20, kind: 'dec', text: 'ordinary decision' }] };
  const original = structuredClone(state);
  stripLegacyReflections(state);
  stripLegacyReflections(state);
  assert.deepEqual(state, original);
});
