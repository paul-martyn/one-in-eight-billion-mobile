import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { loadDerivedModules } from '../../tools/harness/runtimes.mjs';
import { createHost } from '../../src/core/runtime.ts';
import { GameAdapter } from '../../src/adapters/gameAdapter.ts';
import { kinMentionPhrases, peopleVM } from '../../src/adapters/vm/people.ts';
import { findMentions } from '../../src/ui/people/mentions.ts';

const modules = new Map();
const clock = { now: () => Date.UTC(2026, 10, 1), monotonic: () => 0 };
before(async () => {
  for (const lang of ['ru', 'en']) modules.set(lang, await loadDerivedModules(lang));
});
const host = (lang = 'ru') => createHost(modules.get(lang).derivedModule, {
  storage: null, seed: 'russian-localization', lang, clock, viewRandom: () => 0.123,
});

test('русский возраст начала пенсии: реальные шаблоны L, падежи и неизменный RNG', () => {
  const h = host();
  const T = h.top;
  const prices = T.curFix('по ценам России');
  const entropy = h.entropy.getState(), draws = h.entropy.draws;
  for (const [age, at, from] of [[61, 'год', 'года'], [62, 'года', 'лет'], [65, 'лет', 'лет'], [71, 'год', 'года'], [111, 'лет', 'лет'], [121, 'год', 'года']]) {
    assert.equal(T.L`${age}세가 되어 연금이 나오기 시작했습니다.`, `В ${age} ${at} вам начали платить пенсию.`);
    assert.equal(T.L`${age}세부터는 연금으로 연 ${100} (한국 체감 월 ${8})을 받습니다.`, `С ${age} ${from} пенсия составит 100 в год (8 в месяц ${prices}).`);
    assert.equal(T.L`여유↑ 소득↓ · 연금은 ${age}세부터`, `Свободное время↑ доход↓ · пенсия с ${age} ${from}`);
    assert.equal(T.L`${age}세 전에 받기 시작하는 연금이라 그만큼 줄어든 금액입니다.`, `Пенсия начинается раньше ${age} ${from}, поэтому она соответственно меньше.`);
    assert.equal(T.L`연금이 나오는 ${age}세까지 지금처럼 쓰며 지내고도 남을 만큼입니다.`, `Этого с запасом хватит, чтобы жить как сейчас до пенсии в ${age} ${at}.`);
  }
  assert.equal(h.entropy.getState(), entropy);
  assert.equal(h.entropy.draws, draws);
  const english = host('en');
  assert.equal(english.top.L`${61}세가 되어 연금이 나오기 시작했습니다.`, 'At 61, your pension began to be paid.');
});

test('поиск дневника находит русское родство в разных падежах и не путает родственников', () => {
  const T = host().top;
  const journal = [
    { i: 0, text: 'Ваша мать начала работать, и в семейном бюджете стало свободнее.' },
    { i: 1, text: 'Вы говорили о вашей матери.' },
    { i: 2, text: 'Вы встретились с вашим отцом.' },
    { i: 3, text: 'Вы помогли вашей старшей сестре.' },
    { i: 4, text: 'Вы выслушали вашего младшего брата.' },
    { i: 5, text: 'Чужая мать ждала у школы.' },
  ];
  assert.deepEqual(findMentions(journal, [], kinMentionPhrases(T, 'Мать')).map(e => e.i), [1, 0]);
  assert.deepEqual(findMentions(journal, [], kinMentionPhrases(T, 'Отец')).map(e => e.i), [2]);
  assert.deepEqual(findMentions(journal, [], kinMentionPhrases(T, 'Старшая сестра')).map(e => e.i), [3]);
  assert.deepEqual(findMentions(journal, [], kinMentionPhrases(T, 'Младший брат')).map(e => e.i), [4]);
  assert.deepEqual(findMentions(journal, [], kinMentionPhrases(T, 'Мать'), 1).map(e => e.i), [1]);
  assert.deepEqual(findMentions([{ i: 0, text: 'Your mother found work.' }], [], ['your mother']).map(e => e.i), [0]);
});

test('живые родственники и записи памяти получают поисковые формы из core без изменения жизни', async () => {
  const h = host();
  const adapter = new GameAdapter();
  await adapter.boot(async () => h);
  assert.equal(await adapter.startLife('russian-review-start', 0), true);
  for (let i = 0; i < 2000 && !adapter.getSnapshot().companionsReady; i++) await new Promise(resolve => setTimeout(resolve, 1));
  assert(adapter.getSnapshot().companionsReady);
  assert.equal(adapter.getSnapshot().lifePhase, 'birth');
  const state = JSON.stringify(h.top.S), entropy = h.entropy.getState();
  const live = h.read(peopleVM);
  assert(live.family.find(p => p.id === 'mom')?.phrases.includes('ваша мать'));
  const memory = h.read(T => {
    T.S.fam.mom.alive = false;
    return peopleVM(T);
  });
  assert(memory.memory.find(p => p.id === 'mom')?.phrases.includes('вашей матери'));
  assert.equal(JSON.stringify(h.top.S), state);
  assert.equal(h.entropy.getState(), entropy);
  assert.deepEqual(h.errors, []);
});
