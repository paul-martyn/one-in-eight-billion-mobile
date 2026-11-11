// Данные планеты: границы стран (Natural Earth 1:110m, world-atlas 2.0.2 — общественное достояние),
// примерные рождения и смерти в год, несколько городов и имена для пузырей. К каждой стране
// добавлен её код из таблицы стран движка (src/engine/game.en.js), чтобы игра находила страну
// рождения по коду. Пишет src/ui/planet/planetData.js; запускать после изменения таблицы стран.
// Использование: node tools/planet/gen-planet-data.mjs
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');
const { build } = createRequire(import.meta.url)('./planet-data.cjs');
const atlas = JSON.parse(readFileSync(path.join(here, 'countries-110m.json'), 'utf8'));
const game = readFileSync(path.join(root, 'src', 'engine', 'game.en.js'), 'utf8');
const data = build(atlas, game);
const js = (v) => JSON.stringify(v);
const text = `// Сгенерировано tools/planet/gen-planet-data.mjs — руками не править.
// META: [название, короткое название, рождений в год (тыс.), смертей в год (тыс.), широта и долгота
// середины, угловой размер, города «имя,широта,долгота|…», набор имён, показатели из таблицы
// движка или null, код страны в движке]. SHAPES — контуры, упакованные алфавитом CODE.
export const META = ${js(data.META)};
export const SHAPES = ${js(data.SHAPES)};
export const CODE = ${js(data.CODE)};
export const POOLS = ${js(data.POOLS)};
`;
writeFileSync(path.join(root, 'src', 'ui', 'planet', 'planetData.js'), text);
const withIso = data.META.filter((m) => m[10]).length;
console.log(`planetData.js: ${data.META.length} стран на карте, ${withIso} с кодом движка, ${Math.round(text.length / 1024)} КБ`);
if (data.stats.missing.length) console.warn('нет цифр рождений для:', data.stats.missing.join(', '));
