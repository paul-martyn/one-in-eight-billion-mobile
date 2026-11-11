#!/usr/bin/env node
// Проверка токенов:
// 1) src/design/tokens.css совпадает с tokens.json и motion.json;
// 2) в CSS не появляются новые литералы цвета, длительности, кривой и кегля — только var(--…).
// Старые литералы записаны в tools/design/literals-baseline.json: их число в файле может
// только уменьшаться. После переноса литералов на токены — `npm run check:tokens -- --update`.
// 3) пары «текст — фон» из tokens.json → contrast.pairs держат контраст (WCAG 2.x).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCss, outPath } from './tokens-to-css.mjs';
import { contrastFailures } from './contrast.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const baselinePath = path.join(root, 'tools', 'design', 'literals-baseline.json');
const rel = p => path.relative(root, p).replace(/\\/g, '/');


function cssFiles(dir, out = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) { if (f.name !== 'engine') cssFiles(p, out); }
    else if (f.name.endsWith('.css') && p !== outPath) out.push(p);
  }
  return out;
}

const KINDS = ['hex', 'rgb', 'duration', 'easing', 'fontSize'];
const zero = () => Object.fromEntries(KINDS.map(k => [k, 0]));
function count(text) {
  const css = text.replace(/\/\*[\s\S]*?\*\//g, '');
  const n = zero();
  for (const [, prop, value] of css.matchAll(/(?:^|[;{\s])(--[\w-]+|[a-z-]+)\s*:\s*([^;{}]+)/g)) {
    // Кегль — только var(--font-size-…); px в font-size (в том числе внутри clamp) считается литералом.
    if (prop === 'font-size' && /\d(\.\d+)?px\b/.test(value)) n.fontSize++;
    n.hex += (value.match(/#[0-9a-fA-F]{3,8}\b/g) || []).length;
    n.rgb += (value.match(/\b(rgba?|hsla?)\(/g) || []).length;
    n.easing += (value.match(/cubic-bezier\(/g) || []).length;
    if (/^(transition|transition-duration|transition-delay|animation|animation-duration|animation-delay)$/.test(prop)) {
      n.duration += (value.match(/(?:^|[\s(,])\d*\.?\d+m?s\b/g) || []).filter(v => !/^[\s(,]?(0s|0ms|0\.001ms)$/.test(v.trim())).length;
    }
  }
  return n;
}

const failures = [];
const expected = buildCss();
const actual = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf8').replace(/\r\n/g, '\n') : '';
if (actual !== expected) failures.push('src/design/tokens.css устарел — запустите npm run tokens');
const tokens = JSON.parse(fs.readFileSync(path.join(root, 'src', 'design', 'tokens.json'), 'utf8'));
for (const c of contrastFailures(tokens)) failures.push(`контраст: ${c}`);
const pairCount = (tokens.contrast?.pairs ?? []).reduce((n, p) => n + [].concat(p.bg).length, 0);

const current = {};
for (const f of cssFiles(path.join(root, 'src'))) {
  const n = count(fs.readFileSync(f, 'utf8'));
  if (KINDS.some(k => n[k])) current[rel(f)] = n;
}

if (process.argv.includes('--update')) {
  const sorted = Object.fromEntries(Object.entries(current).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(baselinePath, JSON.stringify(sorted, null, 2) + '\n');
  console.log(`базовая линия обновлена: ${Object.keys(sorted).length} файлов`);
  process.exit(failures.length ? 1 : 0);
}

const baseline = fs.existsSync(baselinePath) ? JSON.parse(fs.readFileSync(baselinePath, 'utf8')) : {};
let improved = 0;
const total = zero();
for (const [file, n] of Object.entries(current)) {
  const b = { ...zero(), ...baseline[file] };
  for (const k of KINDS) {
    total[k] += n[k];
    if (n[k] > b[k]) failures.push(`${file}: литералов ${k} стало ${n[k]} (было ${b[k]}) — используйте var(--…) из tokens.css; нужного значения нет — добавьте его в tokens.json / motion.json`);
    else if (n[k] < b[k]) improved++;
  }
}
for (const [file, b] of Object.entries(baseline)) if (!current[file] && KINDS.some(k => b[k])) improved++;

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`токены в порядке; контраст ${pairCount} пар в норме; осталось литералов: цвет ${total.hex}, rgb/hsl ${total.rgb}, длительность ${total.duration}, кривая ${total.easing}, кегль ${total.fontSize}`);
if (improved) console.log('литералов стало меньше базовой линии — зафиксируйте: npm run check:tokens -- --update');
