// Воспроизводимое получение производного core из неизменяемого эталона 0.8.98.
//
// Тело оригинальной сборки копируется побайтно. Генератор только оборачивает
// его в функцию instantiateCore(env): каждое свободное имя (браузерное API,
// встроенный объект JS, данные соседних модулей) связывается с явно
// переданным окружением, поэтому производный core не может незаметно
// обратиться к настоящему window, сети или хранилищу. Подробности и перечень
// технических изменений — docs/core-derivation.md.
//
// Запуск: node tools/core/extract-core.mjs [--check]
//   --check — не записывать файлы, а убедиться, что сгенерированное совпадает.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { analyze } from './scope.mjs';

export const GENERATOR_VERSION = 'extract-core/1';

const root = fileURLToPath(new URL('../..', import.meta.url));
const reference = path.join(root, 'reference');
const outDir = path.join(root, 'src', 'core', 'generated');
const check = process.argv.includes('--check');

const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const provenance = JSON.parse(fs.readFileSync(path.join(reference, 'provenance.json'), 'utf8'));
const locales = JSON.parse(fs.readFileSync(path.join(reference, 'locales-provenance.json'), 'utf8'));

function readReference(relative) {
  const entry = [...provenance.files, ...locales.files].find(f => f.path === relative);
  if (!entry) throw new Error(`Нет записи provenance для ${relative}`);
  const bytes = fs.readFileSync(path.join(reference, relative));
  if (bytes.length !== entry.bytes || sha256(bytes) !== entry.sha256) {
    throw new Error(`${relative} не совпадает с provenance — эталон изменён, генерация остановлена`);
  }
  return { code: bytes.toString('utf8'), sha256: entry.sha256, bytes: entry.bytes, path: relative };
}

// Встроенные объекты JS. Окружение передаёт их из того же realm без изменений;
// явная привязка нужна, чтобы у производного core не осталось свободных имён.
const JS_BUILTINS = new Set([
  'Array', 'Boolean', 'Error', 'Float64Array', 'Int16Array', 'Int32Array', 'Intl', 'JSON', 'Map',
  'Number', 'Object', 'Promise', 'RegExp', 'Set', 'String', 'Uint8Array', 'Uint8ClampedArray',
  'WeakMap', 'encodeURIComponent', 'isFinite', 'parseFloat', 'parseInt',
]);
// Источники недетерминированности: подменяются контролируемыми реализациями.
const CONTROLLED = new Set(['Math', 'Date', 'performance', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'crypto']);
// Данные других скриптов оригинального сайта (era.js и локализованные сборки).
// В исходной странице они появляются как глобальные const соседних <script>,
// иногда позже загрузки игры, поэтому связываются изменяемой ссылкой.
const LATE_GLOBALS = new Set(['ERA', 'AR_G', 'COUNTRY_A', 'COUNTRY_G', 'COUNTRY_GX', 'COUNTRY_IN', 'DE_G', 'IT_G', 'PT_G', 'RU_CS', 'RU_G', 'ZH_HK_T']);

const RESERVED = ['__env', '__G', '__late', '__TOP'];

function wrapGame(name, source) {
  const { code } = source;
  const result = analyze(code);
  if (!result.strictSyntax) throw new Error(`${name}: сборка несовместима со strict mode: ${result.strictSyntaxError}`);
  if (result.blockFunctions.length) throw new Error(`${name}: блочные объявления функций зависят от Annex B`);
  if (result.topLevelThis.length) throw new Error(`${name}: верхнеуровневый this`);
  for (const r of RESERVED) if (result.topLevel.has(r) || result.free.has(r)) throw new Error(`${name}: конфликт имени ${r}`);

  const free = [...result.free.keys()].sort();
  const written = free.filter(n => result.free.get(n).writes > 0);
  if (written.length) throw new Error(`${name}: присваивание необъявленным именам: ${written.join(', ')}`);
  const late = free.filter(n => LATE_GLOBALS.has(n));
  const bound = free.filter(n => !LATE_GLOBALS.has(n));
  const classify = n => (JS_BUILTINS.has(n) ? 'builtin' : CONTROLLED.has(n) ? 'controlled' : LATE_GLOBALS.has(n) ? 'late' : 'host');

  const top = [...result.topLevel.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const accessors = top
    .map(([n, kind]) => (kind === 'let' ? `get ${n}() { return ${n}; }, set ${n}(v) { ${n} = v; }` : `get ${n}() { return ${n}; }`))
    .join(',\n    ');

  const header = [
    '// АВТОМАТИЧЕСКИ СГЕНЕРИРОВАНО tools/core/extract-core.mjs — не редактировать вручную.',
    `// Источник: reference/${source.path} (sha256 ${source.sha256}, ${source.bytes} байт).`,
    '// Тело оригинальной сборки ниже не изменено; добавлены только обёртка и таблица доступа.',
    '/* eslint-disable */',
  ].join('\n');

  const meta = {
    generator: GENERATOR_VERSION,
    source: source.path,
    sourceSha256: source.sha256,
    sourceBytes: source.bytes,
    freeGlobals: Object.fromEntries(free.map(n => [n, classify(n)])),
    topLevelCount: top.length,
  };

  const body = [
    header,
    `export const CORE_META = ${JSON.stringify(meta)};`,
    'export function instantiateCore(__env) {',
    `  const { ${bound.join(', ')} } = __env.globals;`,
    late.length ? `  let ${late.join(', ')};` : '',
    '  // ---- начало оригинальной сборки ----',
    code,
    '  // ---- конец оригинальной сборки ----',
    '  const __late = {',
    late.map(n => `    ${n}: v => { ${n} = v; },`).join('\n'),
    '  };',
    '  const __TOP = {',
    `    ${accessors}`,
    '  };',
    '  return { top: __TOP, setLateGlobal(n, v) { if (!Object.prototype.hasOwnProperty.call(__late, n)) throw new Error("unknown late global " + n); __late[n](v); } };',
    '}',
    '',
  ].join('\n');

  return { body, meta, freeCount: free.length };
}

function wrapEra(source) {
  const result = analyze(source.code);
  const free = [...result.free.keys()].filter(n => n !== 'module');
  if (free.length) throw new Error(`era.js: неожиданные свободные имена ${free.join(', ')}`);
  return [
    '// АВТОМАТИЧЕСКИ СГЕНЕРИРОВАНО tools/core/extract-core.mjs — не редактировать вручную.',
    `// Источник: reference/original-0.8.98/src/era.js (sha256 ${source.sha256}, ${source.bytes} байт); тело не изменено.`,
    '// Оригинальный файл объявляет глобальный const ERA; здесь он возвращается как значение модуля.',
    'export const ERA = (() => {',
    '  const module = undefined;',
    source.code,
    '  return ERA;',
    '})();',
    '',
  ].join('\n');
}

const outputs = [];
for (const lang of ['en', 'ru', 'es', 'fr', 'de']) {
  const name = `game.${lang}.js`;
  const source = readReference(['en', 'ru'].includes(lang) ? `original-0.8.98/src/${name}` : `locales-0.8.98/${name}`);
  const { body, meta, freeCount } = wrapGame(name, source);
  outputs.push({ file: `game.${lang}.core.js`, text: body, note: `${name}: ${meta.topLevelCount} объявлений, ${freeCount} свободных имён связаны с окружением` });
  outputs.push({ file: `game.${lang}.core.meta.json`, text: JSON.stringify(meta, null, 2) + '\n', note: 'метаданные' });
}
outputs.push({ file: 'era.core.js', text: wrapEra(readReference('original-0.8.98/src/era.js')), note: 'era.js' });

let stale = 0;
fs.mkdirSync(outDir, { recursive: true });
for (const o of outputs) {
  const target = path.join(outDir, o.file);
  const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null;
  if (current === o.text) continue;
  if (check) { stale++; console.error(`Устарел ${path.relative(root, target)}`); continue; }
  fs.writeFileSync(target, o.text);
  console.log(`Записан ${path.relative(root, target)} — ${o.note}`);
}
if (check && stale) throw new Error('Производный core не соответствует эталону: запустите npm run core:extract');
if (check) console.log('Производный core соответствует эталону и генератору.');
