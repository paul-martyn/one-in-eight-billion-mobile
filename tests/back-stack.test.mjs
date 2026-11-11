import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackStack } from '../src/flow/back.ts';

test('«Назад» уходит в верхний слой: окно раньше экрана, экран раньше стека', () => {
  const back = createBackStack();
  const calls = [];
  back.add('flow', () => { calls.push('flow'); });
  back.add('dialog', () => { calls.push('dialog'); });
  back.add('screen', () => { calls.push('screen'); });
  assert.equal(back.handle(), true);
  assert.deepEqual(calls, ['dialog']);
});

test('внутри слоя срабатывает последний зарегистрированный; снятый обработчик не вызывается', () => {
  const back = createBackStack();
  const calls = [];
  back.add('dialog', () => { calls.push('first'); });
  const off = back.add('dialog', () => { calls.push('second'); });
  back.handle();
  off();
  back.handle();
  assert.deepEqual(calls, ['second', 'first']);
  assert.equal(back.size(), 1);
});

test('обработчик, вернувший false, пропускает нажатие ниже; без обработчиков нажатие не обработано', () => {
  const back = createBackStack();
  const calls = [];
  back.add('flow', () => { calls.push('flow'); });
  back.add('screen', () => { calls.push('screen'); return false; });
  assert.equal(back.handle(), true);
  assert.deepEqual(calls, ['screen', 'flow']);
  assert.equal(createBackStack().handle(), false);
});
