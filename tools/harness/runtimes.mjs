// Local test harness for the standalone engine. No recovery snapshot is loaded.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createCoreGlobals, CoreTimers, memoryStorage } from '../../src/core/env.ts';

const root = fileURLToPath(new URL('../..', import.meta.url));
const modules = new Map();
let eraModule;

export function harnessEntropy(seed = 0x1a8b2026) {
  let entropy = seed | 0;
  return () => {
    entropy = Math.imul(entropy ^ (entropy >>> 15), 1 | entropy);
    entropy ^= entropy + Math.imul(entropy ^ (entropy >>> 7), 61 | entropy);
    return ((entropy ^ (entropy >>> 14)) >>> 0) / 4294967296;
  };
}

export async function loadDerivedModules(lang = 'en') {
  if (!modules.has(lang)) modules.set(lang, await import(pathToFileURL(path.join(root, 'src/engine', `game.${lang}.js`)).href));
  eraModule ??= await import(pathToFileURL(path.join(root, 'src/engine/era.js')).href);
  return { derivedModule: modules.get(lang), eraModule };
}

export function createDerivedRuntime({ clockAt, entropySeed = 0x1a8b2026, withEra = false, dom = 'null', lang = 'en' } = {}) {
  const mod = modules.get(lang);
  if (!mod) throw new Error(`Call loadDerivedModules(${JSON.stringify(lang)}) first`);
  const network = [], consoleErrors = [];
  const clock = { now: () => clockAt, monotonic: () => 0 };
  const env = { clock, storage: memoryStorage(), timers: new CoreTimers(clock), random: harnessEntropy(entropySeed), network };
  const noop = () => {};
  const globals = createCoreGlobals({
    ...env, lang, dom, onNetwork: item => network.push(item),
    console: { log: noop, info: noop, debug: noop, warn: noop, error: (...args) => consoleErrors.push(args.map(String).join(' ')) },
  }, Object.keys(mod.CORE_META.freeGlobals));
  const core = mod.instantiateCore({ globals });
  if (withEra) core.setLateGlobal('ERA', eraModule.ERA);
  const top = core.top;
  return {
    kind: 'independent', env, network, consoleErrors, core,
    get: name => top[name],
    set: (name, value) => { top[name] = value; },
    eval: code => new Function('__top', `with (__top) { return (${code}); }`)(new Proxy(top, { has: (t, k) => typeof k === 'string' && k in t })),
  };
}
