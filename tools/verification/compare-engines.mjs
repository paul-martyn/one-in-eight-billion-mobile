// Optional development oracle. This file is never imported by the app or default tests.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createDerivedRuntime, loadDerivedModules } from '../harness/runtimes.mjs';
import { CLOCK, SCENARIOS, SNAPSHOT, drive } from '../harness/scenarios.mjs';
import { oracleBaseline } from './baseline.mjs';

const project = fileURLToPath(new URL('../..', import.meta.url));
const arg = name => { const i = process.argv.indexOf(name); return i < 0 ? undefined : process.argv[i + 1]; };
const baseline = oracleBaseline(arg('--baseline') ?? process.env.INDEPENDENT_BASELINE);
const baselineRuntime = path.join(baseline, 'tools/harness/runtimes.mjs');
if (!fs.existsSync(baselineRuntime)) throw new Error(`Optional oracle needs the preserved mobile repository: ${baselineRuntime}. Pass --baseline <path>. Default builds/tests do not need it.`);
const { createOriginalRuntime } = await import(pathToFileURL(baselineRuntime).href);
const locales = (arg('--langs') ?? 'en,ru,es,fr,de').split(',');
const selected = SCENARIOS.filter(s => !arg('--scenario') || s.id === arg('--scenario'));
assert.ok(selected.length, 'scenario exists');
const results = [];
const started = Date.now();

function firstDifference(a, b, at = '$') {
  if (Object.is(a, b)) return null;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return { path: at, expected: a, actual: b };
  const ak = Object.keys(a), bk = Object.keys(b);
  if (JSON.stringify(ak) !== JSON.stringify(bk)) return { path: at, expectedKeys: ak, actualKeys: bk };
  for (const key of ak) { const diff = firstDifference(a[key], b[key], `${at}.${key}`); if (diff) return diff; }
  return null;
}

for (const lang of locales) {
  const { derivedModule } = await loadDerivedModules(lang);
  for (const sc of selected) {
    const at = Date.now();
    const original = createOriginalRuntime({ clockAt: CLOCK, lang, withEra: !!sc.era });
    const independent = createDerivedRuntime({ clockAt: CLOCK, lang, withEra: !!sc.era });
    const trace = [];
    let cursor = 0;
    try {
      drive(original, sc, (i, label) => trace.push([i, label, original.eval(SNAPSHOT)]));
      drive(independent, sc, (i, label) => {
        const expected = trace[cursor++];
        assert.ok(expected, `${lang}/${sc.id}: unexpected command ${i}`);
        assert.equal(label, expected[1], `${lang}/${sc.id}: command type ${i}`);
        const actual = independent.eval(SNAPSHOT);
        if (actual !== expected[2]) {
          const difference = firstDifference(JSON.parse(expected[2]), JSON.parse(actual));
          throw new Error(`${lang}/${sc.id}: command ${i} (${label}), ${JSON.stringify(difference)}`);
        }
      });
      assert.equal(cursor, trace.length, 'same command count');
      assert.equal(independent.get('S').phase, 'dead', 'life completed');
      assert.deepEqual(independent.network, [], 'no engine network calls');
      assert.deepEqual(original.network, [], 'no oracle network calls');
      assert.deepEqual(independent.consoleErrors, [], 'no engine errors');
      assert.deepEqual(original.consoleErrors, [], 'no oracle errors');
      assert.deepEqual(independent.env.storage.dump(), original.env.storage.dump(), 'exact storage parity');
      const end = JSON.parse(trace.at(-1)[2]);
      assert.deepEqual(end.err, [], 'no hook errors');
      results.push({ lang, scenario: sc.id, pass: true, commands: cursor, age: end.S.age, decisions: end.S.stats.decisions, sourceSha256: derivedModule.CORE_META.sourceSha256, milliseconds: Date.now() - at });
      console.log(`PASS ${lang}/${sc.id}: ${cursor} commands, age ${end.S.age}`);
    } catch (error) {
      results.push({ lang, scenario: sc.id, pass: false, commandsCompared: cursor, error: String(error.stack ?? error), milliseconds: Date.now() - at });
      console.error(`FAIL ${lang}/${sc.id}: ${error.message}`);
    }
  }
}
const report = { format: 'independent-engine-oracle/1', testedAt: new Date().toISOString(), method: 'Unmodified locale snapshot in node:vm versus standalone engine; byte-exact full state, RNG counter, hook count and errors after each command, plus final storage.', baseline, total: results.length, passed: results.filter(r => r.pass).length, failed: results.filter(r => !r.pass).length, milliseconds: Date.now() - started, results };
const output = path.resolve(arg('--report') ?? path.join(project, 'artifacts/oracle-comparison.json'));
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ total: report.total, passed: report.passed, failed: report.failed, milliseconds: report.milliseconds, report: output }));
if (report.failed) process.exitCode = 1;
