// Проверка production-сборки: минифицированный чанк core (dist/assets/game.en.core-*.js)
// проходит те же сценарии, что и неминифицированный производный core, с тем же
// результатом после каждой команды. Минификатор не должен менять поведение игры.
// Запуск после `npm run build`: node --experimental-strip-types tools/harness/check-build.mjs [dist]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createDerivedRuntime, loadDerivedModules, harnessEntropy } from './runtimes.mjs';
import { SCENARIOS, SNAPSHOT, drive, CLOCK } from './scenarios.mjs';
import { createCoreGlobals, CoreTimers, memoryStorage } from '../../src/core/env.ts';

const root = fileURLToPath(new URL('../..', import.meta.url));
const dist = path.resolve(process.argv[2] || path.join(root, 'dist'));
const assets = path.join(dist, 'assets');
const pick = prefix => {
  const f = fs.readdirSync(assets).find(n => n.startsWith(prefix) && n.endsWith('.js'));
  if (!f) throw new Error(`В ${assets} нет ${prefix}*.js — сначала npm run build`);
  return path.join(assets, f);
};
const game = await import(pathToFileURL(pick('game.en.core-')).href);
const era = await import(pathToFileURL(pick('era.core-')).href);
const ERA = era.ERA ?? Object.values(era)[0];
if (typeof game.instantiateCore !== 'function' || !game.CORE_META) throw new Error('Чанк core не экспортирует instantiateCore/CORE_META');
await loadDerivedModules();

let failures = 0;
for (const sc of SCENARIOS) {
  const A = createDerivedRuntime({ clockAt: CLOCK, withEra: !!sc.era });
  const want = [];
  drive(A, sc, () => want.push(A.eval(SNAPSHOT)));
  const clock = { now: () => CLOCK, monotonic: () => 0 };
  const globals = createCoreGlobals({ random: harnessEntropy(), clock, storage: memoryStorage(), timers: new CoreTimers(clock), lang: 'en' }, Object.keys(game.CORE_META.freeGlobals));
  const core = game.instantiateCore({ globals });
  if (sc.era) core.setLateGlobal('ERA', ERA);
  const top = core.top;
  const B = { eval: code => new Function('__top', `with (__top) { return (${code}); }`)(new Proxy(top, { has: (t, k) => typeof k === 'string' && k in t })) };
  const got = [];
  drive(B, sc, () => got.push(B.eval(SNAPSHOT)));
  const ok = want.length === got.length && want.every((x, i) => x === got[i]);
  if (!ok) failures++;
  console.log(`${ok ? '✔' : '✖'} ${sc.id}: ${got.length} шагов`);
}
if (failures) throw new Error(`Минифицированный core расходится в ${failures} сценариях`);
console.log(`Production-чанк core совпадает с производным core во всех ${SCENARIOS.length} сценариях.`);
