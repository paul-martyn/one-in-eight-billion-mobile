// Small frozen oracle results make these tests independent of the preserved project.
import '../frozen-environment.mjs';
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createDerivedRuntime, loadDerivedModules } from '../../tools/harness/runtimes.mjs';
import { CLOCK, SCENARIOS, SNAPSHOT, drive } from '../../tools/harness/scenarios.mjs';
const fixture = JSON.parse(fs.readFileSync(new URL('../fixtures/engine-regressions.json', import.meta.url), 'utf8'));
before(async () => { for (const lang of new Set(fixture.cases.map(c => c.lang))) await loadDerivedModules(lang); });
for (const expected of fixture.cases) test(`${expected.lang}/${expected.scenario}: frozen full-life state, RNG and hook regression`, () => {
  assert.equal(CLOCK, fixture.clockAt, 'same deterministic clock as the original oracle');
  const scenario = SCENARIOS.find(s => s.id === expected.scenario);
  assert.ok(scenario);
  const runtime = createDerivedRuntime({ clockAt: CLOCK, lang: expected.lang, withEra: !!scenario.era });
  const commands = drive(runtime, scenario, () => {});
  assert.equal(commands, expected.commands);
  const snapshot = runtime.eval(SNAPSHOT);
  assert.equal(crypto.createHash('sha256').update(snapshot).digest('hex'), expected.sha256, 'complete serialized state, RNG and hooks match the immutable oracle');
  assert.equal(runtime.get('S').phase, 'dead');
  assert.deepEqual(runtime.network, []);
  assert.deepEqual(runtime.consoleErrors, []);
});
