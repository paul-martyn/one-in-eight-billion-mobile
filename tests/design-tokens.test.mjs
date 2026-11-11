import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { contrastRatio, contrastFailures } from '../tools/design/contrast.mjs';
import { scanCss } from '../tools/design/lint-uss.mjs';

const tokens = JSON.parse(fs.readFileSync(new URL('../src/design/tokens.json', import.meta.url), 'utf8'));

test('контраст считается по WCAG: чёрный на белом 21 : 1, одинаковые цвета 1 : 1', () => {
  assert.equal(contrastRatio('#000000', '#ffffff').toFixed(1), '21.0');
  assert.equal(contrastRatio('#fff', '#ffffff'), 1);
});

test('все пары «текст — фон» из токенов держат заданный контраст', () => {
  assert.deepEqual(contrastFailures(tokens), []);
});

test('слишком светлый текст и неизвестный токен попадают в нарушения', () => {
  const broken = { color: { page: '#f2e3c6', pale: '#c9a874' }, contrast: { pairs: [{ fg: 'color.pale', bg: ['color.page', 'color.missing'], min: 4.5 }] } };
  const failures = contrastFailures(broken);
  assert.equal(failures.length, 2);
  assert.match(failures[0], /color\.pale .* color\.page .*нужно 4\.5/);
  assert.match(failures[1], /color\.missing: нет такого цвета/);
});

test('lint:uss находит то, чего нет в USS, и не путает селекторы со значениями', () => {
  const css = [
    '/* box-shadow в комментарии не считается */',
    '.panel { display: flex; border-radius: var(--radius-card); }',
    '.panel--grid { display: grid; box-shadow: none; }',
    '.panel::after { content: ""; }',
    '.row + .row { margin-top: var(--space-2); }',
    '.chip[data-on] { transform: scale(1.1); }',
  ].join('\n');
  const found = scanCss(css);
  const blockers = found.filter(x => x.kind === 'blocker').map(x => `${x.id}@${x.line}`);
  assert.deepEqual(blockers.sort(), ['attribute selector@6', 'grid@3', 'pseudo-element@4', 'sibling combinator@5'].sort());
  assert.deepEqual(found.filter(x => x.kind === 'mapped').map(x => x.id), ['transform']);
});

test('совместимая вёрстка проходит lint:uss без блокеров', () => {
  const css = '.btn { flex-direction: row; padding: 0 var(--space-4); background-color: var(--color-cta); transition: scale var(--duration-press) ease-out; }\n.btn:hover { background-color: var(--color-secondary); }';
  assert.deepEqual(scanCss(css).filter(x => x.kind === 'blocker'), []);
});
