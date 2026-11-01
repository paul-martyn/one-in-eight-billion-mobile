// Команды адаптера против обработчиков старого интерфейса оригинала.
// Слева — неизменённый оригинал в node:vm: его собственные HOOK, обработчики
// кнопок и цикл кадров frame0 работают на инертном документе. Справа —
// производный core с HOOK и командами адаптера. После каждого шага
// сравниваются S целиком, счётчик RND_N и записи хранилища.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createOriginalRuntime, createDerivedRuntime, loadDerivedModules } from '../../tools/harness/runtimes.mjs';
import * as C from '../../src/adapters/commands.ts';
import { installHooks } from '../../src/adapters/hooks.ts';

before(async () => { await loadDerivedModules(); });

const CLOCK = Date.parse('2026-11-01T09:30:00.000Z');
const FRAME = 1 / 60;

function pair(seed) {
  const A = createOriginalRuntime({ clockAt: CLOCK, dom: 'inert' });
  const B = createDerivedRuntime({ clockAt: CLOCK, dom: 'inert' });
  const errors = [];
  installHooks(B.core.top, { log() {}, decision() {}, death() {}, year() {}, error: e => errors.push(String(e)) });
  A.eval(`setRng(seedRng(${JSON.stringify(seed)}))`);
  B.core.top.setRng(B.core.top.seedRng(seed));
  return { A, B, T: B.core.top, errors };
}

function same(A, B, label) {
  const a = A.eval('JSON.stringify({ S, rnd: RND_N })');
  const b = JSON.stringify({ S: B.core.top.S, rnd: B.core.top.RND_N });
  if (a !== b) assert.deepEqual(JSON.parse(b), JSON.parse(a), label);
  const sa = A.env.storage.dump(), sb = B.env.storage.dump();
  for (const k of ['one8b.en.save.v3', 'one8b.en.lives.v1']) assert.equal(sb[k], sa[k], `${label}: хранилище ${k}`);
  assert.deepEqual(prefs(sb['one8b.prefs.v1']), prefs(sa['one8b.prefs.v1']), `${label}: настройки`);
}

// Исключены только флаги одноразовых подсказок старого интерфейса
// (speedHint/shopHint из frame0, 207906-207911): симуляция их не читает,
// новый интерфейс эти подсказки не показывает.
const UI_HINT_PREFS = ['speedHint', 'shopHint'];
function prefs(json) {
  const p = json ? JSON.parse(json) : {};
  for (const k of UI_HINT_PREFS) delete p[k];
  return p;
}

/** Сопутствующие жизни в обоих средах пропускаются одинаково, чтобы сравнивать остальное. */
function skipCompanions(R) {
  R.env.timers.discardAll();
  R.eval('(UI.compsOn = false, UI.certWait = null, S.comps = [], true)');
}

for (const seed of ['cmd-1', 'cmd-2', 'cmd-3']) {
  test(`${seed}: startNewLife → showCert → beginLife → кадры и решения совпадают`, () => {
    const { A, B, T, errors } = pair(seed);
    // 1. Старт жизни (синхронная часть до ломтиков сопутствующих жизней).
    A.eval('startNewLife()');
    C.startLife(T, { now: CLOCK, companionRng: () => 0.5, onCompanions() {} });
    same(A, B, 'startNewLife');
    skipCompanions(A); skipCompanions(B);
    // 2. Свидетельство.
    A.eval('showCert()');
    const no = C.revealCertificate(T);
    same(A, B, 'showCert');
    assert.match(no, /^[A-Z]{3}-\d{4}-\d{7}$/);
    // 3. Начало жизни.
    A.eval('beginLife()');
    C.beginLife(T, CLOCK);
    same(A, B, 'beginLife');
    // 4. Кадры по 1/60 с и решения (первый вариант), 12 лет жизни.
    A.eval('last = 0');
    // frame0 сам вычисляет dt = min(0.25, (e - last) / 1000); команде передаётся то же число.
    let ms = 0, lastMs = 0, steps = 0, choices = 0;
    while (T.S.phase === 'life' && T.S.age < 12 && steps < 200000) {
      if (T.S.pending) {
        const k = T.S.pending.view.choices[0].k;
        assert.equal(A.eval('S.pending && S.pending.id'), T.S.pending.id, 'одно и то же решение');
        A.eval(`(UI.decAt = -1e9, pickChoice(${JSON.stringify(k)}))`);
        C.chooseOption(T, T.S.pending.id, k);
        same(A, B, `pickChoice ${choices}`);
        choices++;
        continue;
      }
      ms += FRAME * 1000;
      A.eval(`frame0(${ms})`);
      C.step(T, Math.min(0.25, (ms - lastMs) / 1e3), T.lossNew);
      lastMs = ms;
      steps++;
      if (steps % 600 === 0) same(A, B, `кадр ${steps}`);
    }
    same(A, B, 'конец');
    assert.ok(choices > 3, 'решения были');
    assert.ok(T.S.age >= 12);
    assert.deepEqual(errors, []);
    assert.deepEqual(B.consoleErrors, [], "renderAll без ошибок в производном core");
    assert.deepEqual(A.consoleErrors, [], "обработчики оригинала без ошибок на инертном документе");
    assert.deepEqual(A.network, []);
    assert.deepEqual(B.network, []);
  });
}

test('пауза, скорость и «до следующего решения» совпадают с кнопками оригинала', () => {
  const { A, B, T } = pair('cmd-time');
  A.eval('startNewLife()'); C.startLife(T, { now: CLOCK, companionRng: () => 0.5, onCompanions() {} });
  skipCompanions(A); skipCompanions(B);
  A.eval('showCert(); beginLife()'); C.revealCertificate(T); C.beginLife(T, CLOCK);
  A.eval('setSpeed(4)'); C.setSpeed(T, 4); same(A, B, 'setSpeed');
  A.eval('(S.paused = !S.paused, S.ff = false, save())'); C.togglePause(T); same(A, B, 'pause');
  A.eval('(S.ff = !S.ff, S.paused = false)'); C.toggleFastForward(T); same(A, B, 'ff');
});

// ---- Лист «Spend & invest» и авто-ответы ------------------------------------
// Ветви обработчика кликов оригинала (data-buy … data-inv, 208323-208367)
// исполняются текстом из эталона. В оригинале каждая ветвь заканчивается
// openShop(): изменяющая часть (shopSeen, S.ff = false) плюс перерисовка листа,
// где shopItems тратит 3–5 чисел на варианты хобби. Новый интерфейс строит лист
// в песочнице (docs/core-derivation.md), поэтому в оригинале openShop заменён
// своей изменяющей частью. Остальное — buyShop, журнал, fxEnd, счётчики,
// renderAll, save, renderStats — исполняется как есть.
import fs from 'node:fs';
const GAME_SRC = fs.readFileSync(new URL('../../reference/original-0.8.98/src/game.en.js', import.meta.url), 'utf8');
const SHOP_CHAIN = (() => {
  const a = GAME_SRC.indexOf('if (r.dataset.buy) {', GAME_SRC.indexOf('if (r.dataset.buy && shopAsk(r)) return;'));
  const b = GAME_SRC.indexOf(' else if (r.id === "cardSaveBtn")', a);
  assert.ok(a > 0 && b > a, 'ветви обработчика листа найдены в эталоне');
  return GAME_SRC.slice(a, b);
})();
const OPEN_SHOP_MUTATING = 'openShop = function () { if (!shopCan()) return; UI.prefs.shopSeen || ((UI.prefs.shopSeen = 1), lsSet(PREF_KEY, UI.prefs)); S.ff = !1; }';

/** Что сейчас есть в листе — чтение без следа: S, RND_N и rndF восстанавливаются (проверяется сравнением с оригиналом). */
function shopNow(T) {
  const S0 = structuredClone(T.S), n = T.RND_N, f = T.rndF;
  T.rndF = T.seedRng('shop-peek');
  try {
    const items = T.shopCan() ? T.shopItems() : [];
    const buys = [];
    for (const it of items) {
      if (it.opts) { for (const o of it.opts) if (o.avail) buys.push(o.id); }
      else if (it.avail) buys.push(it.id);
    }
    const sets = T.shopSets().map(s => s.id);
    const inv = T.INV_KS.filter(k => T.invOK(k) && k !== (T.S.invest || 'cash'));
    return { buys, sets, inv };
  } finally {
    T.S = S0; T.RND_N = n; T.rndF = f;
  }
}

function startPair(seed) {
  const p = pair(seed);
  const { A, B, T } = p;
  A.eval('startNewLife()'); C.startLife(T, { now: CLOCK, companionRng: () => 0.5, onCompanions() {} });
  skipCompanions(A); skipCompanions(B);
  A.eval('showCert(); beginLife()'); C.revealCertificate(T); C.beginLife(T, CLOCK);
  A.eval(OPEN_SHOP_MUTATING);
  A.eval('last = 0');
  p.ms = 0;
  return p;
}
/** Один кадр 1/60 с в обоих мирах. */
function frame(p) {
  const prev = p.ms;
  p.ms += FRAME * 1000;
  p.A.eval(`frame0(${p.ms})`);
  C.step(p.T, Math.min(0.25, (p.ms - prev) / 1e3), p.T.lossNew);
}

for (const seed of ['shop-1', 'shop-2']) {
  test(`${seed}: покупки и настройки образа жизни совпадают с обработчиками листа оригинала`, () => {
    const p = startPair(seed);
    const { A, B, T, errors } = p;
    const run = (ds, cmd, label) => {
      A.eval(`(function (r) { ${SHOP_CHAIN} })({ dataset: ${JSON.stringify(ds)} })`);
      cmd();
      same(A, B, label);
    };
    let bought = 0, other = 0, checks = 0;
    while (T.S.phase === 'life' && T.S.age < 46) {
      if (T.S.pending) {
        const k = T.S.pending.view.choices[0].k;
        A.eval(`(UI.decAt = -1e9, pickChoice(${JSON.stringify(k)}))`);
        C.chooseOption(T, T.S.pending.id, k);
        continue;
      }
      const age = T.S.age;
      frame(p);
      if (T.S.age === age || T.S.age < 16 || T.S.pending || T.S.phase !== 'life') continue;
      // Новый год жизни: открыть лист и сделать то, что доступно.
      checks++;
      A.eval('openShop()'); C.openSpend(T);
      const now = shopNow(T);
      same(A, B, `${age + 1}: чтение листа не оставило следа`);
      for (const key of now.buys.slice(0, 2)) { run({ buy: key }, () => C.buy(T, key), `${T.S.age}: buy ${key}`); bought++; }
      const turn = checks % 6;
      if (turn === 0 && now.sets[0]) { run({ set: now.sets[0] }, () => C.toggleHabit(T, now.sets[0]), `set ${now.sets[0]}`); other++; }
      if (turn === 1) { const v = ['good', 'out', 'usual'][checks % 3]; run({ diet: v }, () => C.setDiet(T, v), `diet ${v}`); other++; }
      if (turn === 2 && now.inv[0]) { run({ inv: now.inv[0] }, () => C.setInvest(T, now.inv[0]), `inv ${now.inv[0]}`); other++; }
      if (turn === 3) { const v = ['some', 'none', 'full'][checks % 3]; run({ gift: v }, () => C.setGift(T, v), `gift ${v}`); other++; }
      if (turn === 4) { const v = checks % 2 ? 'more' : 'base'; run({ ins: v }, () => C.setInsurance(T, v), `ins ${v}`); other++; }
      if (turn === 5) { const v = checks % 2 ? 'm' : 'f'; run({ sur: v }, () => C.setSurname(T, v), `sur ${v}`); other++; }
    }
    same(A, B, 'конец');
    assert.ok(bought >= 5, `покупок было ${bought}`);
    assert.ok(other >= 5, `настроек было ${other}`);
    assert.deepEqual(errors, []);
    assert.deepEqual(B.consoleErrors, []);
    assert.deepEqual(A.consoleErrors, []);
    assert.deepEqual(A.network, []);
    assert.deepEqual(B.network, []);
  });
}

test('«Skip to the end»: авто-ответы и «до решения» до смерти совпадают с авто-режимом оригинала', () => {
  const p = startPair('skip-1');
  const { A, B, T, errors } = p;
  let auto = 0, frames = 0;
  // Как adapter.skipToEnd: открытое решение — autoAnswer (= pickChoice(autoChoice(…), true)),
  // иначе снять паузу, включить «до решения» и прожить кадр.
  while (T.S.phase === 'life' && frames < 2_000_000) {
    if (T.S.pending) {
      A.eval('(UI.decAt = -1e9, pickChoice(autoChoice(S.pending), !0))');
      C.autoAnswer(T);
      if (++auto % 10 === 0) same(A, B, `авто-ответ ${auto}`);
      continue;
    }
    if (T.S.paused) { A.eval('(S.paused = !S.paused, S.ff = !1, save())'); C.setPaused(T, false); }
    A.eval('(S.ff = !0)'); T.S.ff = true;
    frame(p);
    frames++;
  }
  same(A, B, 'смерть');
  assert.equal(T.S.phase, 'dead');
  assert.ok(auto > 10, `авто-ответов ${auto}`);
  assert.ok(T.S.stats.auto >= auto);
  assert.deepEqual(errors, []);
  assert.deepEqual(B.consoleErrors, []);
  assert.deepEqual(A.consoleErrors, []);
});
