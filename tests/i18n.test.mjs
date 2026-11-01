import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resolveLocale, SUPPORTED_LOCALES } from '../src/i18n/locales.ts';
import { translate } from '../src/i18n/messages.ts';
import { scaleNumbers } from '../src/i18n/numbers.ts';

const directory = new URL('../src/i18n/', import.meta.url);
function catalog(locale) {
  const out = {};
  for (const file of fs.readdirSync(new URL(locale + '/', directory))) {
    if (!file.endsWith('.json')) continue;
    const entries = JSON.parse(fs.readFileSync(new URL(`${locale}/${file}`, directory), 'utf8'));
    for (const [key, value] of Object.entries(entries)) {
      assert.equal(out[key], undefined, `Повтор ключа ${locale}/${key}`);
      assert.equal(typeof value, 'string');
      assert.ok(value.trim(), `Пустой перевод ${locale}/${key}`);
      assert.doesNotMatch(value, /\uFFFD/, `Повреждённая кодировка ${locale}/${key}`);
      out[key] = value;
    }
  }
  return out;
}
const english = catalog('en');
const placeholders = value => [...new Set(value.match(/\{\w+\}/g) ?? [])].sort();
for (const locale of SUPPORTED_LOCALES) test(`${locale}: все экраны переведены, подстановки не потеряны`, () => {
  const dict = catalog(locale);
  for (const [key, value] of Object.entries(english)) {
    assert.ok(key in dict, `${locale}: нет ${key}`);
    assert.deepEqual(placeholders(dict[key]), placeholders(value), `${locale}/${key}`);
  }
  for (const key of Object.keys(dict)) {
    const base = key.replace(/\.(one|few|many|other|zero|two)$/, '');
    assert.ok(key in english || base in english, `Лишний ключ ${locale}/${key}`);
    if (!(key in english)) assert.deepEqual(placeholders(dict[key]), placeholders(english[base]));
  }
});

test('язык устройства, регион, сохранённый выбор и неизвестные локали', () => {
  assert.equal(resolveLocale(null, ['ru-BY', 'en-US']), 'ru');
  assert.equal(resolveLocale(null, ['es-MX']), 'es');
  assert.equal(resolveLocale('de', ['ru-RU']), 'de');
  assert.equal(resolveLocale('broken', ['fr-CA']), 'fr');
  assert.equal(resolveLocale(null, ['ar', 'ja']), 'en');
  assert.equal(resolveLocale(null, []), 'en');
});

test('русские формы 1/2/5/11/21/22 и подстановки пользовательского текста', () => {
  const ru = catalog('ru');
  for (const [n, word] of [[1, 'жизнь'], [2, 'жизни'], [5, 'жизней'], [11, 'жизней'], [21, 'жизнь'], [22, 'жизни']]) {
    assert.equal(translate(ru, english, 'ru', 'hub.livesCount', { n }), `${n} ${word}`);
  }
  assert.equal(translate(ru, english, 'ru', 'certificate.brothers.many', { n: 2 }), '2 брата');
  assert.equal(translate(ru, english, 'ru', 'certificate.sisters.many', { n: 21 }), '21 сестра');
  assert.equal(translate(ru, english, 'ru', 'certificate.sibOlder', { n: 1 }), 'Старше на 1 год');
  assert.equal(translate(ru, english, 'ru', 'people.mentionsNone', { name: '<Имя {n}>' }), 'В дневнике пока нет упоминаний: <Имя {n}>.');
  assert.equal(translate({}, english, 'ru', 'error.retry'), english['error.retry']);
  assert.equal(translate({}, english, 'ru', 'missing'), '[missing]');
});

test('счётчики сумм сохраняют десятичные и разрядные разделители каждого языка', () => {
  for (const locale of ['en-US', 'ru', 'es', 'es-US', 'es-MX', 'fr', 'de']) {
    const options = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
    const text = `€ ${new Intl.NumberFormat(locale, options).format(12345.6)}`;
    const half = `€ ${new Intl.NumberFormat(locale, options).format(6172.8)}`;
    assert.equal(scaleNumbers(text, 0.5, locale, true), half, locale);
    assert.equal(scaleNumbers(text, 1, locale), text, 'последний кадр — точный оригинал');
  }
  assert.equal(scaleNumbers('Нет денег', 0.5, 'ru'), 'Нет денег');
});

test('итоги наград выбирают русскую форму по числу кристаллов, включая форматированные суммы', () => {
  const ru = catalog('ru');
  for (const [count, word] of [[0, 'кристаллов'], [1, 'кристалл'], [2, 'кристалла'], [5, 'кристаллов'], [11, 'кристаллов'], [21, 'кристалл'], [22, 'кристалла'], [1002, 'кристалла']]) {
    const gems = new Intl.NumberFormat('ru').format(count);
    const params = { dollars: '60', gems, count };
    assert.equal(translate(ru, english, 'ru', 'rewards.totalValue', params), `+60 $ · +${gems} ${word}`);
    assert.equal(translate(ru, english, 'ru', 'rewards.claimed', params), `Получено: +60 $ и +${gems} ${word}. Жизнь сохранена в «Жизнях».`);
  }
});
