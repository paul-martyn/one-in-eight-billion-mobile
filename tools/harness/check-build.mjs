// Source engine versus its production chunks after every deterministic command.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createDerivedRuntime, loadDerivedModules, harnessEntropy } from './runtimes.mjs';
import { SCENARIOS, SNAPSHOT, drive, CLOCK } from './scenarios.mjs';
import { createCoreGlobals, CoreTimers, memoryStorage } from '../../src/core/env.ts';
import { verifyDistributionBoundaries } from '../engine-boundaries.mjs';
const root = fileURLToPath(new URL('../..', import.meta.url));
const dist = path.resolve(process.argv[2] ?? path.join(root, 'dist'));
const boundaryFailures = verifyDistributionBoundaries(dist);
if (boundaryFailures.length) throw new Error(boundaryFailures.join('\n'));
const assets = path.join(dist, 'assets');
const names = fs.readdirSync(assets);
const pick = prefix => {
  const matches = names.filter(n => n.startsWith(prefix) && n.endsWith('.js'));
  assert.equal(matches.length, 1, `one production chunk ${prefix}*.js; run npm run build first`);
  return path.join(assets, matches[0]);
};
const era = await import(pathToFileURL(pick('era-')).href);
const ERA = era.ERA ?? Object.values(era)[0];
let cases = 0, commands = 0;
for (const lang of ['en', 'ru', 'es', 'fr', 'de']) {
  await loadDerivedModules(lang);
  const bundle = await import(pathToFileURL(pick(`game.${lang}-`)).href);
  assert.equal(typeof bundle.instantiateCore, 'function');
  assert.ok(bundle.CORE_META);
  for (const scenario of SCENARIOS) {
    const source = createDerivedRuntime({ clockAt: CLOCK, lang, withEra: !!scenario.era });
    const expected = [];
    drive(source, scenario, (i, label) => expected.push([i, label, source.eval(SNAPSHOT)]));
    const clock = { now: () => CLOCK, monotonic: () => 0 };
    const network = [], errors = [];
    const noop = () => {};
    const globals = createCoreGlobals({ random: harnessEntropy(), clock, storage: memoryStorage(), timers: new CoreTimers(clock), lang, onNetwork: item => network.push(item), console: { log: noop, info: noop, debug: noop, warn: noop, error: (...args) => errors.push(args.map(String).join(' ')) } }, Object.keys(bundle.CORE_META.freeGlobals));
    const core = bundle.instantiateCore({ globals });
    if (scenario.era) core.setLateGlobal('ERA', ERA);
    const scope = new Proxy(core.top, { has: (t, k) => typeof k === 'string' && k in t });
    const runtime = { eval: code => new Function('__top', `with (__top) { return (${code}); }`)(scope) };
    let cursor = 0;
    drive(runtime, scenario, (i, label) => {
      const want = expected[cursor++];
      assert.ok(want, `${lang}/${scenario.id}: extra production command`);
      assert.equal(label, want[1]);
      assert.equal(runtime.eval(SNAPSHOT), want[2], `${lang}/${scenario.id}: production diverged at ${i}/${label}`);
    });
    assert.equal(cursor, expected.length);
    assert.deepEqual(network, []);
    assert.deepEqual(errors, []);
    commands += cursor;
    cases++;
  }
  console.log(`PASS production ${lang}: ${SCENARIOS.length} full-life scenarios`);
}
console.log(`Production matches source: ${cases} scenarios, ${commands} command snapshots.`);
