// Адаптер целиком: команды применяются ровно один раз, снимки для экранов не
// меняют жизнь, сохранение продолжается после перезагрузки.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { loadDerivedModules } from '../../tools/harness/runtimes.mjs';
import { createHost, STORAGE_PREFIX } from '../../src/core/runtime.ts';
import { memoryStorage } from '../../src/core/env.ts';
import { GameAdapter, STEP_SECONDS } from '../../src/adapters/gameAdapter.ts';
import * as C from '../../src/adapters/commands.ts';
import { installHooks } from '../../src/adapters/hooks.ts';
import { CoreEntropy } from '../../src/core/entropy.ts';
import { activitiesView } from '../../src/adapters/vm/activities.ts';
import { birthOddsView } from '../../src/adapters/vm/certificate.ts';
import { decisionExtra, lifeNoticeTexts } from '../../src/adapters/vm/life.ts';
import { moneyVM } from '../../src/adapters/vm/money.ts';
import { oddsView } from '../../src/adapters/vm/odds.ts';
import { peopleVM } from '../../src/adapters/vm/people.ts';
import { rollVM } from '../../src/adapters/vm/roll.ts';
import { spendView, lifePrefsView } from '../../src/adapters/vm/spend.ts';
import { worldRates } from '../../src/adapters/vm/hub.ts';
import { householdAppearances, familyAppearances, peopleAppearances, companionAppearances, playerAppearance } from '../../src/adapters/vm/appearance.ts';
import { lifeReward } from '../../src/adapters/vm/rewards.ts';
import { deathView } from '../../src/adapters/vm/death.ts';
import { endSummary } from '../../src/adapters/vm/end.ts';

/** Все builders экранов — так, как их вызывают экраны (в песочнице адаптера). */
const ALL_VIEWS = [activitiesView, birthOddsView, decisionExtra, lifeNoticeTexts, moneyVM, oddsView, peopleVM, rollVM, worldRates, lifePrefsView, T => spendView(T, 'activities'), T => spendView(T, 'money'),
  householdAppearances, familyAppearances, peopleAppearances, companionAppearances, playerAppearance, lifeReward,
  deathView, endSummary];
function readEverything(a) {
  for (const b of ALL_VIEWS) a.view(b);
}

let mods;
before(async () => { mods = await loadDerivedModules(); });

const CLOCK = Date.parse('2026-11-01T09:30:00.000Z');
const clock = () => ({ now: () => CLOCK, monotonic: () => 0 });
let idn = 0;
const id = () => `t${++idn}`;

function host(storage, seed = 'adapter-seed') {
  return createHost(mods.derivedModule, {
    storage, seed, clock: clock(), viewRandom: () => 0.123,
    loadEra: async () => mods.eraModule.ERA,
  });
}

async function adapterWith(storage, seed) {
  const a = new GameAdapter();
  await a.boot(async () => host(storage, seed));
  return a;
}

const waitFor = async (pred, label) => {
  for (let i = 0; i < 2000 && !pred(); i++) await new Promise(r => setTimeout(r, 1));
  assert.ok(pred(), label);
};

/** Та же жизнь без адаптера и без единого чтения для экранов. */
function bare(seed, plan) {
  const h = host(null, seed);
  const T = h.top;
  installHooks(T, { log() {}, decision() {}, death() {}, year() {}, error(e) { throw e; } });
  const comp = new CoreEntropy(h.entropy.getState() ^ 0x5bd1e995);
  let done = false;
  C.startLife(T, { now: CLOCK, companionRng: comp.next, onCompanions: () => { done = true; } });
  for (let i = 0; i < 100000 && !done; i++) h.drainTimers();
  C.revealCertificate(T);
  C.beginLife(T, CLOCK);
  for (const p of plan) {
    if (p.choose) C.chooseOption(T, T.S.pending.id, p.choose);
    else for (let i = 0; i < p.steps; i++) C.step(T, STEP_SECONDS, T.lossNew);
  }
  return T;
}

test('полная жизнь через адаптер совпадает с той же жизнью без чтений представления', async () => {
  const a = await adapterWith(null, 'adapter-life');
  assert.equal(a.getSnapshot().status, 'ready');
  assert.equal(await a.startLife(id(), 0), true);
  await waitFor(() => a.getSnapshot().companionsReady, 'сопутствующие жизни готовы');
  assert.equal(a.revealCertificate(id()), true);
  const cert = a.getSnapshot().certificate;
  assert.ok(cert && cert.name && cert.country && cert.companions.length === 4);
  assert.equal(a.beginLife(id()), true);
  const plan = [];
  let steps = 0;
  let lastVersion = -1;
  for (let guard = 0; guard < 400000 && a.getSnapshot().lifePhase === 'life'; guard++) {
    const s = a.getSnapshot();
    // Каждый новый снимок: все экраны читают всё, что могут показать.
    if (s.version !== lastVersion) { readEverything(a); lastVersion = a.getSnapshot().version; }
    if (s.life.pending) {
      const k = s.life.pending.choices[s.life.pending.choices.length - 1].k;
      if (steps) plan.push({ steps }), (steps = 0);
      assert.equal(a.choose(id(), s.life.pending.id, k), true);
      plan.push({ choose: k });
      continue;
    }
    a.advance(STEP_SECONDS);
    steps++;
  }
  if (steps) plan.push({ steps });
  // Экран смерти и итоги жизни читают уже мёртвую жизнь — и тоже ничего не меняют.
  readEverything(a);
  assert.ok(a.view(deathView), 'окно смерти: данные есть');
  assert.ok(a.view(endSummary), 'итоги жизни: данные есть');
  readEverything(a);
  const snap = a.getSnapshot();
  assert.equal(snap.lifePhase, 'dead');
  assert.ok(snap.ended && snap.ended.story.length > 20 && snap.ended.lives.length === 5);
  assert.equal(snap.pastLives.length, 1, 'жизнь записана в архив');
  const T0 = bare('adapter-life', plan);
  assert.equal(JSON.stringify(T0.S), JSON.stringify(a['host'].top.S), 'снимки экранов не изменили жизнь');
  assert.equal(a['host'].errors.length, 0, a['host'].errors.map(e => e.message).join('\n'));
  assert.deepEqual(a['host'].network, []);
});

test('повторная команда и устаревшие ожидания отклоняются', async () => {
  const a = await adapterWith(null, 'adapter-dup');
  const cmd = id();
  assert.equal(await a.startLife(cmd, 0), true);
  assert.equal(await a.startLife(cmd, 0), false, 'тот же id');
  assert.equal(await a.startLife(id(), 0), false, 'двойное нажатие «Be Born» с устаревшим lifeSeq');
  await waitFor(() => a.getSnapshot().companionsReady, 'готово');
  const r = id();
  assert.equal(a.revealCertificate(r), true);
  const no = a.getSnapshot().certificate.certNo;
  assert.equal(a.revealCertificate(id()), true, 'повторный показ не тянет новый номер');
  assert.equal(a.getSnapshot().certificate.certNo, no);
  assert.equal(a.beginLife(id()), true);
  assert.equal(a.beginLife(id()), false, 'вторая попытка начать жизнь отклонена');
  for (let i = 0; i < 200000 && !a.getSnapshot().life.pending; i++) a.advance(STEP_SECONDS);
  const p = a.getSnapshot().life.pending;
  const tap = id();
  const before = a['host'].top.S.stats.decisions;
  assert.equal(a.choose(tap, p.id, p.choices[0].k), true);
  assert.equal(a.choose(tap, p.id, p.choices[0].k), false, 'повторный тап');
  assert.equal(a.choose(id(), p.id, p.choices[0].k), false, 'решение уже закрыто');
  assert.equal(a['host'].top.S.stats.decisions - before, a['host'].top.S.pending ? 1 : 1);
});

test('перезагрузка продолжает ту же жизнь и тот же поток случайности', async () => {
  const storage = memoryStorage();
  const a = await adapterWith(storage, 'adapter-reload');
  await a.startLife(id(), 0);
  await waitFor(() => a.getSnapshot().companionsReady, 'готово');
  a.revealCertificate(id());
  a.beginLife(id());
  const live = (ad, untilAge) => {
    const T = ad['host'].top;
    for (let i = 0; i < 400000 && T.S.phase === 'life' && T.S.age < untilAge; i++) {
      if (T.S.pending) ad.choose(id(), T.S.pending.id, T.S.pending.view.choices[0].k); else ad.advance(STEP_SECONDS);
    }
  };
  live(a, 3);
  // Снимок хранилища сразу после годового сохранения (HOOK.year в конце 3-го года).
  const snapshot = new Map();
  for (let i = 0; i < storage.length; i++) snapshot.set(storage.key(i), storage.getItem(storage.key(i)));
  assert.ok(snapshot.get(STORAGE_PREFIX + 'one8b.en.save.v3'), 'сохранение в отдельном пространстве ключей');
  for (const k of snapshot.keys()) assert.ok(k.startsWith(STORAGE_PREFIX), k);
  live(a, 9);
  // «Перезагрузка»: новый экземпляр из снимка хранилища.
  const b = await adapterWith(memoryStorage(snapshot), 'seed не используется — поток восстанавливается');
  const sb = b.getSnapshot();
  assert.equal(sb.lifePhase, 'life');
  assert.equal(sb.life.paused, true, 'жизнь возобновляется на паузе, как resumeLive');
  assert.equal(b.togglePause(id()), true);
  live(b, 9);
  const SA = a['host'].top.S, SB = b['host'].top.S;
  assert.equal(JSON.stringify(SB), JSON.stringify(SA), 'после перезагрузки жизнь пошла так же');
});

test('смена валюты пересоздаёт core, сохраняет жизнь и меняет только отображение денег', async () => {
  const storage = memoryStorage();
  const load = async () => host(storage, 'adapter-currency');
  const a = new GameAdapter();
  await a.boot(load);
  await a.startLife(id(), 0);
  await waitFor(() => a.getSnapshot().companionsReady, 'готово');
  a.revealCertificate(id());
  a.beginLife(id());
  for (let i = 0; i < 300000 && a['host'].top.S.age < 2; i++) {
    const s = a['host'].top.S;
    if (s.pending) a.choose(id(), s.pending.id, s.pending.view.choices[0].k); else a.advance(STEP_SECONDS);
  }
  const before = JSON.parse(JSON.stringify(a['host'].top.S));
  const keys = a.currencies().map(c => c.key);
  assert.deepEqual(keys.slice(0, 4), ['USD', 'GBP', 'EUR', 'CAD'], 'валюты английской сборки оригинала');
  assert.equal(await a.setCurrency(id(), 'GBP', load), true);
  const T = a['host'].top;
  assert.equal(T.CUR, 'GBP');
  assert.match(T.wonStr(1000), /£/);
  assert.equal(a.getSnapshot().lifePhase, 'life');
  const after = JSON.parse(JSON.stringify(T.S));
  // restore0 ставит паузу (resumeLive) и снимает ускорение — остальное то же.
  before.paused = true; before.ff = false;
  assert.deepEqual(after, before);
});

test('журнал команд воспроизводит ту же жизнь (replay для регрессий и Unity)', async () => {
  const { replayLife, stateHash } = await import('../../tools/harness/replay.mjs');
  let at = CLOCK;
  const a = new GameAdapter();
  await a.boot(async () => createHost(mods.derivedModule, { storage: null, seed: 'replay-src', clock: { now: () => at, monotonic: () => 0 }, viewRandom: () => 0.9, loadEra: async () => mods.eraModule.ERA }));
  await a.startLife(id(), 0);
  await waitFor(() => a.getSnapshot().companionsReady, 'готово');
  at += 7000; a.revealCertificate(id());
  at += 9000; a.beginLife(id());
  let k = 0;
  for (let i = 0; i < 600000 && a.getSnapshot().lifePhase === 'life'; i++) {
    const T = a['host'].top;
    if (T.S.pending) { at += 1500; a.choose(id(), T.S.pending.id, T.S.pending.view.choices[k++ % T.S.pending.view.choices.length].k); continue; }
    // Игрок иногда меняет фокус, скорость и ставит паузу — это тоже часть журнала.
    if (i % 997 === 0 && T.focusOptions().length) { const o = T.focusOptions(); a.setFocus(id(), o[(i / 997) % o.length | 0]); }
    if (i % 4001 === 0) a.setSpeed(id(), [1, 2, 4, 8][(i / 4001) % 4 | 0]);
    if (i % 7919 === 0) { a.togglePause(id()); a.togglePause(id()); }
    a.advance(STEP_SECONDS);
  }
  const replay = a.exportReplay();
  assert.ok(replay && replay.commands.length > 20);
  const b = await replayLife(JSON.parse(JSON.stringify(replay)));
  assert.equal(stateHash(b['host'].top.S), stateHash(a['host'].top.S));
  assert.equal(b['host'].top.S.phase, 'dead');
});

test('снимок сразу отражает фазу рождения после startLife', async () => {
  const a = await adapterWith(null, 'adapter-phase');
  assert.equal(a.getSnapshot().lifePhase, 'none');
  await a.startLife(id(), 0);
  assert.equal(a.getSnapshot().lifePhase, 'birth');
  assert.equal(a.getSnapshot().meta.energy, 4, 'новая жизнь стоит 1 энергии из 5');
});

test('Skip to the end, награда за жизнь и Claim (мета-слой не меняет жизнь)', async () => {
  const { replayLife, stateHash } = await import('../../tools/harness/replay.mjs');
  const storage = memoryStorage();
  const a = await adapterWith(storage, 'adapter-skip');
  await a.startLife(id(), 0);
  await waitFor(() => a.getSnapshot().companionsReady, 'готово');
  a.revealCertificate(id());
  a.beginLife(id());
  for (let i = 0; i < 300000 && a['host'].top.S.age < 10; i++) {
    const s = a['host'].top.S;
    if (s.pending) a.choose(id(), s.pending.id, s.pending.view.choices[0].k); else a.advance(STEP_SECONDS);
  }
  const t0 = Date.now();
  const skip = a.skipToEnd(id());
  assert.equal(a.getSnapshot().skipping, true);
  assert.equal(a.togglePause(id()), false, 'во время пропуска команды закрыты');
  assert.equal(await skip, true);
  assert.equal(a.getSnapshot().skipping, false);
  const ms = Date.now() - t0;
  const snap = a.getSnapshot();
  assert.equal(snap.lifePhase, 'dead');
  assert.ok(snap.ended, 'итоги жизни');
  // Окно смерти, итоги и pop-up награды после пропуска читают мёртвую жизнь.
  readEverything(a);
  assert.ok(a.view(deathView) && a.view(endSummary), 'данные смерти после пропуска');
  const reward = snap.meta.pendingReward;
  assert.ok(reward && reward.items.some(x => x.kind === 'firstInCountry'), 'первая жизнь в стране — награда');
  assert.equal(reward.gems, 2);
  assert.equal(a.claimReward(id()), true);
  const m = a.getSnapshot().meta;
  assert.equal(m.dollars, reward.dollars);
  assert.equal(m.gems, reward.gems);
  assert.equal(m.unseenLives, 1);
  assert.equal(m.pendingReward, null);
  assert.equal(a.claimReward(id()), false, 'повторный Claim');
  a.seeLives();
  assert.equal(a.getSnapshot().meta.unseenLives, 0);
  assert.equal(a['host'].errors.length, 0);
  const b = await replayLife(a.exportReplay());
  assert.equal(stateHash(b['host'].top.S), stateHash(a['host'].top.S), 'skip воспроизводится журналом');
  console.log(`skipToEnd: ${ms} ms, age ${snap.ended.age}`);
});
