// Две среды исполнения одной игры для проверок эквивалентности.
//
// original: неизменённый файл эталона исполняется как обычный <script> в
//   отдельном контексте node:vm (так его исполнял исходный проверочный harness).
// derived:  производный core src/core/generated/*.core.js — тело того же файла
//   внутри instantiateCore(env).
//
// Обе среды получают окружение одного и того же устройства (src/core/env.ts),
// но создают его независимо: общих объектов, потоков случайности и хранилищ нет.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createCoreGlobals, CoreTimers, memoryStorage } from '../../src/core/env.ts';

const root = fileURLToPath(new URL('../..', import.meta.url));
const refSrc = path.join(root, 'reference', 'original-0.8.98', 'src');
const refRaw = path.join(root, 'reference', 'original-0.8.98', 'raw', '1in8b.life');
const ORIGINAL_FILES = {
  src: { game: path.join(refSrc, 'game.en.js'), era: path.join(refSrc, 'era.js') },
  raw: { game: path.join(refRaw, 'a', 'en.ab507954eb.js'), era: path.join(refRaw, 'era.js.query-4ba0ec31d5') },
};

/** Генератор Math.random исходного harness (tools/porting-example.mjs). */
export function harnessEntropy(seed = 0x1a8b2026) {
  let entropy = seed | 0;
  return () => {
    entropy = Math.imul(entropy ^ (entropy >>> 15), 1 | entropy);
    entropy ^= entropy + Math.imul(entropy ^ (entropy >>> 7), 61 | entropy);
    return ((entropy ^ (entropy >>> 14)) >>> 0) / 4294967296;
  };
}

function makeEnv({ clockAt, entropySeed, network }) {
  const clock = { now: () => clockAt, monotonic: () => 0 };
  const storage = memoryStorage();
  const timers = new CoreTimers(clock);
  const random = harnessEntropy(entropySeed);
  return { clock, storage, timers, random, network };
}

/** console ядра: ошибки (reportCaught) собираются для проверки, остальное молчит. */
function quietConsole(errors) {
  const noop = () => {};
  return { log: noop, info: noop, debug: noop, warn: noop, error: (...a) => errors.push(a.map(String).join(' ')) };
}

const cache = new Map();
const read = file => {
  if (!cache.has(file)) cache.set(file, fs.readFileSync(file, 'utf8'));
  return cache.get(file);
};

/**
 * Неизменённый оригинал в node:vm. Глобальный объект контекста — те же
 * привязки окружения, которые получает производный core.
 */
export function createOriginalRuntime({ clockAt, entropySeed = 0x1a8b2026, variant = 'src', withEra = false, dom = 'null' } = {}) {
  const files = ORIGINAL_FILES[variant];
  const network = [];
  const env = makeEnv({ clockAt, entropySeed, network });
  const metaFile = path.join(root, 'src', 'core', 'generated', 'game.en.core.meta.json');
  const required = Object.keys(JSON.parse(fs.readFileSync(metaFile, 'utf8')).freeGlobals);
  const consoleErrors = [];
  const globals = createCoreGlobals({ ...env, lang: 'en', dom, onNetwork: a => network.push(a), console: quietConsole(consoleErrors) }, required);
  const context = vm.createContext({ ...globals });
  const run = (code, filename = 'harness') => vm.runInContext(code, context, { filename, timeout: 120_000 });
  if (withEra) run(read(files.era), 'era.js');
  run(read(files.game), path.basename(files.game));
  return {
    kind: `original:${variant}`,
    env,
    network,
    consoleErrors,
    // Доступ к верхнеуровневым именам скрипта: const/let видны только через выражение.
    get: name => run(name),
    set: (name, value) => { context.__harnessValue = value; run(`${name} = __harnessValue`); delete context.__harnessValue; },
    eval: code => run(code),
  };
}

let derivedModule = null;
let eraModule = null;
export async function loadDerivedModules() {
  derivedModule ??= await import(pathToFileURL(path.join(root, 'src', 'core', 'generated', 'game.en.core.js')).href);
  eraModule ??= await import(pathToFileURL(path.join(root, 'src', 'core', 'generated', 'era.core.js')).href);
  return { derivedModule, eraModule };
}

/** Производный core; перед вызовом нужен await loadDerivedModules(). */
export function createDerivedRuntime({ clockAt, entropySeed = 0x1a8b2026, withEra = false, dom = 'null' } = {}) {
  if (!derivedModule) throw new Error('loadDerivedModules() не вызван');
  const network = [];
  const env = makeEnv({ clockAt, entropySeed, network });
  const consoleErrors = [];
  const globals = createCoreGlobals({ ...env, lang: 'en', dom, onNetwork: a => network.push(a), console: quietConsole(consoleErrors) }, Object.keys(derivedModule.CORE_META.freeGlobals));
  const core = derivedModule.instantiateCore({ globals });
  if (withEra) core.setLateGlobal('ERA', eraModule.ERA);
  const top = core.top;
  return {
    kind: 'derived',
    env,
    network,
    consoleErrors,
    core,
    get: name => top[name],
    set: (name, value) => { top[name] = value; },
    // Выражения выполняются с доступом к верхнеуровневым именам через прокси-область.
    eval: code => new Function('__top', `with (__top) { return (${code}); }`)(new Proxy(top, { has: (t, k) => typeof k === 'string' && k in t })),
  };
}
