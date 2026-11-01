// Воспроизведение журнала команд (docs/replay-format.md) на производном core
// через тот же адаптер, что и в приложении. Часы возвращают время каждой
// команды; поток случайности начинается с записанного состояния.
//   node --experimental-strip-types tools/harness/replay.mjs replay.json
import fs from 'node:fs';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { loadDerivedModules } from './runtimes.mjs';
import { createHost, ENTROPY_KEY, STORAGE_PREFIX } from '../../src/core/runtime.ts';
import { memoryStorage } from '../../src/core/env.ts';
import { GameAdapter, STEP_SECONDS } from '../../src/adapters/gameAdapter.ts';

export async function replayLife(replay) {
  if (replay.format !== '1in8b-replay/1') throw new Error(`Неизвестный формат ${replay.format}`);
  let mods = await loadDerivedModules();
  let lang = 'en';
  for (const candidate of ['ru', 'es', 'fr', 'de']) {
    if (replay.core === mods.derivedModule.CORE_META.sourceSha256) break;
    lang = candidate;
    mods = await loadDerivedModules(candidate);
  }
  if (replay.core !== mods.derivedModule.CORE_META.sourceSha256) throw new Error('Журнал записан для другой сборки core');
  if (replay.stepSeconds !== STEP_SECONDS) throw new Error('Другая длина шага времени');
  let at = replay.commands[0]?.at ?? 0;
  const storage = memoryStorage([
    [STORAGE_PREFIX + ENTROPY_KEY, String(replay.entropy)],
    [STORAGE_PREFIX + 'one8b.prefs.v1', JSON.stringify(replay.prefs)],
  ]);
  const a = new GameAdapter();
  await a.boot(async () => createHost(mods.derivedModule, {
    storage, lang, seed: 'replay', clock: { now: () => at, monotonic: () => 0 }, viewRandom: () => 0.5,
    loadEra: async () => mods.eraModule.ERA,
  }));
  let n = 0;
  const id = () => `replay-${++n}`;
  for (const c of replay.commands) {
    for (let guard = 0; a.steps < c.step; guard++) {
      if (guard > 5_000_000) throw new Error(`Шаг ${c.step} недостижим (сейчас ${a.steps})`);
      a.advance(STEP_SECONDS);
    }
    at = c.at;
    let ok;
    switch (c.cmd) {
      case 'startLife':
        ok = await a.startLife(id(), a.getSnapshot().lifeSeq);
        for (let i = 0; i < 100000 && !a.getSnapshot().companionsReady; i++) await new Promise(r => setTimeout(r, 0));
        break;
      case 'revealCertificate': ok = a.revealCertificate(id()); break;
      case 'beginLife': ok = a.beginLife(id()); break;
      case 'choose': ok = a.choose(id(), c.args[0], c.args[1], c.args[2] ?? ''); break;
      case 'togglePause': ok = a.togglePause(id()); break;
      case 'setPaused': ok = a.setPaused(id(), c.args[0]); break;
      case 'setSpeed': ok = a.setSpeed(id(), c.args[0]); break;
      case 'toggleFastForward': ok = a.toggleFastForward(id()); break;
      case 'setFocus': ok = a.setFocus(id(), c.args[0]); break;
      case 'skipToEnd': ok = await a.skipToEnd(id()); break;
      case 'openSpend': ok = a.openSpend(id()); break;
      case 'buy': a.buy(id(), c.args[0]); ok = true; break;
      case 'setGift': ok = a.setGift(id(), c.args[0]); break;
      case 'setDiet': ok = a.setDiet(id(), c.args[0]); break;
      case 'toggleHabit': ok = a.toggleHabit(id(), c.args[0]); break;
      case 'setInsurance': ok = a.setInsurance(id(), c.args[0]); break;
      case 'setSurname': ok = a.setSurname(id(), c.args[0]); break;
      case 'setInvest': ok = a.setInvest(id(), c.args[0]); break;
      default: throw new Error(`Неизвестная команда ${c.cmd}`);
    }
    if (!ok) throw new Error(`Команда ${c.cmd} на шаге ${c.step} отклонена при воспроизведении`);
  }
  // Время после последней команды.
  for (let guard = 0; replay.endStep != null && a.steps < replay.endStep; guard++) {
    if (guard > 5_000_000) throw new Error(`Конечный шаг ${replay.endStep} недостижим`);
    a.advance(STEP_SECONDS);
  }
  return a;
}

export const stateHash = S => crypto.createHash('sha256').update(JSON.stringify(S)).digest('hex');

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const replay = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const a = await replayLife(replay);
  const S = a['host'].top.S;
  console.log(JSON.stringify({ phase: S.phase, age: S.age, decisions: S.stats.decisions, sha256: stateHash(S) }, null, 2));
}
