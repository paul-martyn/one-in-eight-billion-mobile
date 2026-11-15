// Контракт с генератором персонажей Peepulation (копия src/vendor/peepulation, обновление — npm run peeps:sync).
// Генератор ещё будет сильно меняться; эти проверки ловят то, что сломает игру после синхронизации: пропавшие или
// переименованные имена, другой вид селекторов айдла, детали без файлов, правила без нужных разделов.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as G from '../src/vendor/peepulation/peepulation.js';

const rules = JSON.parse(fs.readFileSync(new URL('../src/vendor/peepulation/rules.json', import.meta.url), 'utf8'));

test('генератор отдаёт всё, чем пользуется игра (src/ui/peeps/peeps.ts)', () => {
  for (const fn of ['preload', 'peepsCharacter', 'relative', 'originFromGame', 'atAge', 'heightK', 'useScale', 'peepsContent', 'babyContent', 'ppCss', 'withRandom']) {
    assert.equal(typeof G[fn], 'function', fn);
  }
  for (const band of ['baby', 'child', 'teen', 'adult', 'elder']) assert.equal(typeof G.AGES[band]?.scale, 'number', `AGES.${band}`);
  assert.equal(typeof G.GROUND, 'number');
  assert.deepEqual(Object.keys(G.FRAMES.portrait).sort(), ['h', 'w', 'x', 'y']);
  assert.ok('V1' in G && 'RULES' in G);
});

test('айдл включается селектором body[data-anim="idle"] — адаптер заменяет его своим классом', () => {
  const css = G.ppCss();
  assert.match(css, /body\[data-anim="idle"\] \.pp-torso/);
  assert.match(css, /\.pp-eyes/);
  assert.match(css, /@keyframes pp-breathe-torso/);
});

test('withRandom подменяет Math.random только на время вызова', () => {
  const keep = Math.random;
  const got = G.withRandom(() => 0.25, () => [Math.random(), Math.random()]);
  assert.deepEqual(got, [0.25, 0.25]);
  assert.equal(Math.random, keep);
});

test('происхождение из данных игры: этническая группа, затем страна, затем группа', async () => {
  await G.preload({ rules, partsRoot: 'about:blank/' }).catch(() => {});
  assert.deepEqual(G.originFromGame({ group: 'a', ethnic: 'us_black' }), { group: 'a', profile: 'africanDiasporaMixed' });
  assert.deepEqual(G.originFromGame({ group: 'n', iso: 'BRA' }), { group: 'n', profile: 'latinAmerica' });
  assert.deepEqual(G.originFromGame({ group: 's', iso: 'IND' }), { group: 's', profile: 'southAsia' });
  assert.equal(G.originFromGame({ group: 'nope' }).group, 'n');
});

test('у каждой детали из манифеста есть файл в public/peeps/parts', () => {
  const root = new URL('../public/peeps/parts/', import.meta.url);
  const manifest = JSON.parse(fs.readFileSync(new URL('manifest.json', root), 'utf8'));
  const missing = [];
  for (const [id, p] of Object.entries(manifest.parts)) {
    for (const f of [p.file, ...Object.values(p.files || {})].filter(Boolean)) if (!fs.existsSync(new URL(f, root))) missing.push(`${id}: ${f}`);
  }
  assert.deepEqual(missing, []);
  assert.ok(rules.ages && rules.profileFromGame && rules.phenotypeProfiles, 'rules.json: ages, profileFromGame, phenotypeProfiles');
});
