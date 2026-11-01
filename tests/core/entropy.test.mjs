// Поток Math.random ядра совпадает с seedRng оригинала и продолжается после сохранения состояния.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { CoreEntropy } from '../../src/core/entropy.ts';
import { createDerivedRuntime, loadDerivedModules } from '../../tools/harness/runtimes.mjs';
import { CLOCK } from '../../tools/harness/scenarios.mjs';

before(async () => { await loadDerivedModules(); });

test('CoreEntropy.fromSeed даёт ту же последовательность, что seedRng оригинала', () => {
  const R = createDerivedRuntime({ clockAt: CLOCK });
  for (const seed of ['a', 'one in eight billion', '1in8b-porting-synthetic-v1']) {
    const original = R.core.top.seedRng(seed);
    const ours = CoreEntropy.fromSeed(seed);
    for (let i = 0; i < 1000; i++) assert.equal(ours.next(), original(), `${seed} #${i}`);
  }
});

test('состояние потока можно сохранить и продолжить', () => {
  const a = CoreEntropy.fromSeed('resume');
  for (let i = 0; i < 37; i++) a.next();
  const b = new CoreEntropy(a.getState());
  for (let i = 0; i < 100; i++) assert.equal(b.next(), a.next());
});
