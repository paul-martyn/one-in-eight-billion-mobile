#!/usr/bin/env node
// lint:uss — что в CSS не переносится в USS Unity UI Toolkit (правила — раздел
// «Совместимость с USS» в D:\Projects\1in8b\CLAUDE.md).
//
// npm run lint:uss                     — все src/**/*.css против базовой линии tools/design/uss-baseline.json:
//                                        число «блокеров» в файле может только уменьшаться
// npm run lint:uss -- --update         — записать базовую линию (после того как блокеров стало меньше)
// npm run lint:uss -- a.css b.css      — строгая проверка конкретных файлов (новый дизайн): каждая находка со строкой
//
// Блокеры — у свойства нет аналога в USS. «С заменой» — переносится, но иначе (отчёт, без провала).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const baselinePath = path.join(root, 'tools', 'design', 'uss-baseline.json');
const tokensCss = path.join(root, 'src', 'design', 'tokens.css');

// [id, где искать: 'sel' | 'val' | 'any', regexp, подсказка]
export const BLOCKERS = [
  ['grid', 'val', /display:\s*(inline-)?grid\b|grid-template[\w-]*\s*:|grid-(column|row|area)\s*:|place-(items|content|self)\s*:/g, 'flex: строки и колонки'],
  ['pseudo-element', 'sel', /::?(before|after|placeholder|selection|marker)\b/g, 'отдельный элемент в UXML'],
  ['keyframes', 'any', /@keyframes\b|(?:^|[;{\s])animation(-name)?\s*:/g, 'USS-переходы или LitMotion'],
  ['box-shadow', 'val', /box-shadow\s*:(?!\s*none\b)/g, '9-slice спрайт'],
  ['clip-path / mask', 'val', /(clip-path|mask(-image)?)\s*:/g, 'overflow: hidden + спрайт'],
  ['gradient', 'val', /(linear|radial|conic)-gradient\(/g, 'спрайт'],
  ['calc / clamp / min / max', 'val', /\b(calc|clamp|min|max)\(/g, 'px или %, расчёт в коде'],
  ['vh / vw / cq / em / rem', 'val', /\d(\.\d+)?(vh|vw|vmin|vmax|svh|dvh|lvh|cqw|cqh|cqi|cqb|r?em)\b/g, 'px от кадра 393 или %'],
  ['z-index', 'val', /z-index\s*:/g, 'порядок элементов в иерархии'],
  ['attribute selector', 'sel', /\[[a-z-]+([~|^$*]?=[^\]]*)?\]/gi, 'класс-модификатор'],
  ['structural pseudo-class', 'sel', /:(not|has|is|where|nth-[a-z-]+)\(|:(first|last|only)-(child|of-type)\b/g, 'класс-модификатор'],
  ['sibling combinator', 'sel', /[^\s,(]\s*[+~]\s*[.#a-z*[]/gi, 'класс-модификатор'],
  ['!important', 'val', /!important/g, 'специфичность селектора'],
  ['position fixed / sticky', 'val', /position:\s*(fixed|sticky)/g, 'absolute'],
  ['filter / backdrop-filter', 'val', /(?:^|[;{\s])(backdrop-)?filter\s*:/g, 'спрайт или tint'],
  ['@media / @container / @supports', 'any', /@(media|container|supports)\b/g, 'PanelSettings и safe area'],
];
export const MAPPED = [
  ['font-weight (число)', /font-weight:\s*\d/g, 'классы шрифта base.uss'],
  ['line-height', /line-height\s*:/g, 'высота строки / -unity-paragraph-spacing'],
  ['transform', /(?:^|[;{\s])transform\s*:/g, 'translate / scale / rotate'],
  ['inset', /(?:^|[;{\s])inset\s*:/g, 'top / right / bottom / left'],
  ['gap', /(?:^|[;{\s])(row-|column-)?gap\s*:/g, 'margin у детей'],
  ['text-transform', /text-transform\s*:/g, 'регистр в строке локализации'],
  ['overflow auto / scroll', /overflow(-[xy])?:\s*(auto|scroll)/g, 'ScrollView'],
  ['display inline / block', /display:\s*(inline|block|inline-flex|inline-block|contents)\b/g, 'flex (по умолчанию column)'],
];

const lineOf = (text, index) => text.slice(0, index).split('\n').length;

/** Находки в CSS: [{ id, kind: 'blocker' | 'mapped', line, hint }]. */
export function scanCss(source) {
  const css = source.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));
  const found = [];
  // Селекторы и тела правил (без вложенности @media — её ловит отдельное правило).
  const parts = { sel: [], val: [] };
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selStart = m.index;
    parts.sel.push([m[1], selStart]);
    parts.val.push([m[2], selStart + m[1].length + 1]);
  }
  for (const [id, where, re, hint] of BLOCKERS) {
    const chunks = where === 'any' ? [[css, 0]] : parts[where];
    for (const [text, offset] of chunks) for (const m of text.matchAll(re)) found.push({ id, kind: 'blocker', line: lineOf(css, offset + m.index), hint });
  }
  for (const [id, re, hint] of MAPPED) for (const [text, offset] of parts.val) for (const m of text.matchAll(re)) found.push({ id, kind: 'mapped', line: lineOf(css, offset + m.index), hint });
  return found;
}

function cssFiles(dir, out = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) { if (f.name !== 'engine') cssFiles(p, out); }
    else if (f.name.endsWith('.css') && p !== tokensCss) out.push(p);
  }
  return out;
}
const rel = p => path.relative(root, p).replace(/\\/g, '/');
const countBy = (items, key) => items.reduce((o, x) => ((o[x[key]] = (o[x[key]] ?? 0) + 1), o), {});

function main(args) {
  const explicit = args.filter(a => !a.startsWith('--'));
  if (explicit.length) {
    let blockers = 0;
    for (const f of explicit) {
      const found = scanCss(fs.readFileSync(f, 'utf8')).sort((a, b) => a.line - b.line);
      for (const x of found) {
        if (x.kind === 'blocker') blockers++;
        console.log(`${f}:${x.line}  ${x.kind === 'blocker' ? 'нет в USS' : 'с заменой'}: ${x.id} → ${x.hint}`);
      }
    }
    console.log(blockers ? `блокеров: ${blockers}` : 'блокеров нет');
    return blockers ? 1 : 0;
  }

  const current = {};
  const totals = { blocker: {}, mapped: {} };
  for (const f of cssFiles(path.join(root, 'src'))) {
    const found = scanCss(fs.readFileSync(f, 'utf8'));
    const b = countBy(found.filter(x => x.kind === 'blocker'), 'id');
    for (const x of found) totals[x.kind][x.id] = (totals[x.kind][x.id] ?? 0) + 1;
    if (Object.keys(b).length) current[rel(f)] = b;
  }
  if (args.includes('--update')) {
    const sorted = Object.fromEntries(Object.entries(current).sort(([a], [b]) => a.localeCompare(b)));
    fs.writeFileSync(baselinePath, JSON.stringify(sorted, null, 2) + '\n');
    console.log(`базовая линия USS обновлена: ${Object.keys(sorted).length} файлов`);
    return 0;
  }
  const baseline = fs.existsSync(baselinePath) ? JSON.parse(fs.readFileSync(baselinePath, 'utf8')) : {};
  const failures = [];
  let improved = false;
  for (const [file, counts] of Object.entries(current)) {
    for (const [id, n] of Object.entries(counts)) {
      const was = baseline[file]?.[id] ?? 0;
      if (n > was) failures.push(`${file}: «${id}» стало ${n} (было ${was}) — в USS этого нет; см. npm run lint:uss -- ${file}`);
      else if (n < was) improved = true;
    }
  }
  for (const [file, counts] of Object.entries(baseline)) for (const [id, was] of Object.entries(counts)) if ((current[file]?.[id] ?? 0) < was) improved = true;
  const fmt = o => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ');
  if (failures.length) { console.error(failures.join('\n')); return 1; }
  console.log(`USS: новых блокеров нет. Осталось блокеров — ${fmt(totals.blocker) || 'нет'}`);
  console.log(`С заменой при переносе — ${fmt(totals.mapped) || 'нет'}`);
  if (improved) console.log('блокеров стало меньше базовой линии — зафиксируйте: npm run lint:uss -- --update');
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));
