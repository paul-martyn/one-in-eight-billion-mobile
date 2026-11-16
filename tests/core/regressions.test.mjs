// Owned regression fixtures, verified step by step against the reference with
// reflection scheduling removed. Historical 0.8.98 oracle fixtures stay intact.
import '../frozen-environment.mjs';
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createDerivedRuntime, loadDerivedModules } from '../../tools/harness/runtimes.mjs';
import { CLOCK, SCENARIOS, SNAPSHOT, drive } from '../../tools/harness/scenarios.mjs';
const fixture = JSON.parse(fs.readFileSync(new URL('../fixtures/engine-regressions-no-reflections.json', import.meta.url), 'utf8'));
before(async () => { for (const lang of new Set(fixture.cases.map(c => c.lang))) await loadDerivedModules(lang); });
for (const expected of fixture.cases) test(`${expected.lang}/${expected.scenario}: reflection-free full-life state, RNG and hooks`, () => {
  assert.equal(CLOCK, fixture.clockAt, 'same deterministic clock as the original oracle');
  const scenario = SCENARIOS.find(s => s.id === expected.scenario);
  assert.ok(scenario);
  const runtime = createDerivedRuntime({ clockAt: CLOCK, lang: expected.lang, withEra: !!scenario.era });
  const commands = drive(runtime, scenario, () => {
    assert.notEqual(runtime.get('S').pending?.id, 'reflect');
    assert.equal(Object.hasOwn(runtime.get('S'), 'journal'), false);
  });
  assert.equal(commands, expected.commands);
  const snapshot = runtime.eval(SNAPSHOT);
  assert.equal(crypto.createHash('sha256').update(snapshot).digest('hex'), expected.sha256, 'complete serialized state, RNG and hooks match the verified owned fixture');
  assert.equal(runtime.get('S').phase, 'dead');
  assert.deepEqual(runtime.network, []);
  assert.deepEqual(runtime.consoleErrors, []);
});
