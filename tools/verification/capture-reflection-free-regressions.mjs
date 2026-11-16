// Explicit development-only recapture after the approved removal of reflections.
// Original frozen fixtures are never overwritten. A reference copy receives only
// the two scheduling/milestone changes, then every simulation step is compared.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { parse } from 'acorn';
import { createCoreGlobals, CoreTimers, memoryStorage } from '../../src/core/env.ts';
import { createDerivedRuntime, harnessEntropy, loadDerivedModules } from '../harness/runtimes.mjs';
import { CLOCK, SCENARIOS, SNAPSHOT, drive } from '../harness/scenarios.mjs';

const baseline = process.argv[2];
if (!baseline) throw new Error('Pass a directory containing the pre-removal game.<lang>.js and state-effects.js copies.');
process.env.TZ = 'Europe/Minsk';
const original = JSON.parse(fs.readFileSync(new URL('../../tests/fixtures/engine-regressions.json', import.meta.url), 'utf8'));
const result = { format: 'owned-engine-regressions/1', change: 'reflection prompts removed', clockAt: CLOCK,
  method: 'Every command compared with pre-removal engine after removing only reflection scheduling and its milestone override. Historical oracle fixtures unchanged.', cases: [] };
const walk = (n, fn, p = null) => {
  if (!n || typeof n !== 'object') return;
  if (n.type) fn(n, p);
  for (const value of Object.values(n)) if (Array.isArray(value)) value.forEach(x => walk(x, fn, n)); else if (value && typeof value === 'object') walk(value, fn, n);
};
const refs = new Map();
async function reference(lang) {
  if (refs.has(lang)) return refs.get(lang);
  let source = fs.readFileSync(path.join(baseline, `game.${lang}.js`), 'utf8');
  const edits = [];
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
  walk(ast, (n, p) => {
    if (n.type === 'FunctionDeclaration' && n.id.name === 'milestone') {
      const first = n.body.body.find(x => x.type === 'IfStatement');
      assert.match(source.slice(first.test.start, first.test.end), /REFLECT_AGES/);
      edits.push([first.start, first.end, source.slice(first.alternate.start, first.alternate.end)]);
    }
    if (n.type === 'LogicalExpression' && p?.type === 'SequenceExpression' && source.slice(n.start, n.end).includes('REFLECT_AGES')) {
      const i = p.expressions.indexOf(n);
      edits.push([n.start, p.expressions[i + 1].start, '']);
    }
  });
  assert.equal(edits.length, 2, 'reference receives exactly two intentional behavior edits');
  for (const [start, end, text] of edits.sort((a, b) => b[0] - a[0])) source = source.slice(0, start) + text + source.slice(end);
  source = source.replace('"./state-effects.js"', JSON.stringify(pathToFileURL(path.resolve(baseline, 'state-effects.js')).href));
  const mod = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  refs.set(lang, mod);
  return mod;
}
function refRuntime(mod, lang, eraModule) {
  const network = [], consoleErrors = [], clock = { now: () => CLOCK, monotonic: () => 0 };
  const env = { clock, storage: memoryStorage(), timers: new CoreTimers(clock), random: harnessEntropy() };
  const noop = () => {};
  const globals = createCoreGlobals({ ...env, lang, onNetwork: x => network.push(x),
    console: { log: noop, info: noop, debug: noop, warn: noop, error: (...args) => consoleErrors.push(args.map(String).join(' ')) } }, Object.keys(mod.CORE_META.freeGlobals));
  const core = mod.instantiateCore({ globals });
  core.setLateGlobal('ERA', eraModule.ERA);
  const top = core.top;
  return { network, consoleErrors, get: name => top[name], eval: code => new Function('__top', `with (__top) { return (${code}); }`)(new Proxy(top, { has: (t, k) => typeof k === 'string' && k in t })) };
}
for (const entry of original.cases) {
  const { eraModule } = await loadDerivedModules(entry.lang);
  const ref = refRuntime(await reference(entry.lang), entry.lang, eraModule);
  const current = createDerivedRuntime({ clockAt: CLOCK, lang: entry.lang, withEra: true });
  const scenario = SCENARIOS.find(s => s.id === entry.scenario), trace = [];
  drive(ref, scenario, (step, label) => trace.push([step, label, ref.eval(SNAPSHOT)]));
  let cursor = 0;
  const commands = drive(current, scenario, (step, label) => {
    const expected = trace[cursor++];
    assert.deepEqual([step, label], expected.slice(0, 2));
    assert.equal(current.eval(SNAPSHOT), expected[2], `${entry.lang}/${entry.scenario} step ${step}: unrelated simulation change`);
    assert.notEqual(current.get('S').pending?.id, 'reflect');
    assert.equal(Object.hasOwn(current.get('S'), 'journal'), false);
  });
  assert.equal(cursor, trace.length);
  assert.deepEqual(current.network, []);
  assert.deepEqual(current.consoleErrors, []);
  const state = current.get('S');
  assert.equal(state.phase, 'dead');
  result.cases.push({ lang: entry.lang, scenario: entry.scenario, commands, age: state.age, decisions: state.stats.decisions,
    sha256: crypto.createHash('sha256').update(current.eval(SNAPSHOT)).digest('hex') });
  console.log(`${entry.lang}/${entry.scenario}: every step matches the reference without prompts`);
}
fs.writeFileSync(new URL('../../tests/fixtures/engine-regressions-no-reflections.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
