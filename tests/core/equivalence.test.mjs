// Эквивалентность производного core и неизменённого оригинала.
// «Эталон не изменился» проверяет verify:core; здесь проверяется поведение.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createOriginalRuntime, createDerivedRuntime, loadDerivedModules } from '../../tools/harness/runtimes.mjs';
import { SCENARIOS, SNAPSHOT, drive, CLOCK } from '../../tools/harness/scenarios.mjs';

before(async () => { await loadDerivedModules(); });

const examples = new URL('../../reference/original-0.8.98/examples/', import.meta.url);
const example = name => fs.readFileSync(new URL(name, examples), 'utf8');

test('производный core воспроизводит эталонную регрессию 1in8b-porting-synthetic-v1 побайтно', () => {
  // Повтор tools/porting-example.mjs исходного снимка: те же часы, тот же
  // дополнительный поток Math.random, те же команды и HOOK без эффектов.
  const R = createDerivedRuntime({ clockAt: CLOCK });
  const T = R.core.top;
  for (const k of Object.keys(T.HOOK)) T.HOOK[k] = () => {};
  T.setRng(T.seedRng('1in8b-porting-synthetic-v1'));
  T.newLife('birth', 60, 'CAN', { sex: 'F' });
  assert.equal(JSON.stringify({ S: T.S, at: CLOCK }, null, 2) + '\n', example('synthetic-birth.save.json'));
  T.save();
  assert.equal(R.env.storage.getItem(T.lk(T.SAVE_KEY)), JSON.stringify({ S: T.S, at: CLOCK }), 'конверт save() {S, at}');
  T.S.phase = 'life';
  for (let step = 0; step < 12000 && T.S.phase === 'life' && T.S.age < 25; step++) {
    if (T.S.pending) T.choose(T.autoChoice(T.S.pending)); else T.tick(T.S.yearSec / 3);
  }
  assert.equal(JSON.stringify({ S: T.S, at: CLOCK }, null, 2) + '\n', example('synthetic-progress.save.json'));
  for (let step = 0; step < 12000 && T.S.phase === 'life'; step++) {
    if (T.S.pending) T.choose(T.autoChoice(T.S.pending)); else T.tick(T.S.yearSec / 3);
  }
  assert.equal(JSON.stringify(T.S, null, 2) + '\n', example('synthetic-completed.life.json'));
  assert.equal(JSON.stringify(T.summaryOf(T.S), null, 2) + '\n', example('synthetic-summary.json'));
  assert.equal(T.S.age, 82);
  assert.equal(T.S.stats.decisions, 59);
  assert.deepEqual(R.network, []);
});

for (const sc of SCENARIOS) {
  test(`сценарий ${sc.id}: оригинал и производный core совпадают после каждой команды`, () => {
    const A = createOriginalRuntime({ clockAt: CLOCK, withEra: !!sc.era });
    const B = createDerivedRuntime({ clockAt: CLOCK, withEra: !!sc.era });
    const trace = [];
    drive(A, sc, (i, label) => trace.push([i, label, A.eval(SNAPSHOT)]));
    let k = 0;
    drive(B, sc, (i, label) => {
      const want = trace[k++];
      assert.ok(want, `лишний шаг ${i} в производном core`);
      assert.equal(label, want[1], `тип шага ${i}`);
      const got = B.eval(SNAPSHOT);
      if (got !== want[2]) {
        const a = JSON.parse(want[2]), b = JSON.parse(got);
        assert.deepEqual(b, a, `расхождение на шаге ${i} (${label})`);
      }
    });
    assert.equal(k, trace.length, 'число шагов');
    const end = JSON.parse(trace[trace.length - 1][2]);
    assert.equal(end.S.phase, 'dead', 'жизнь завершена');
    assert.deepEqual(end.err, [], 'HOOK.err без ошибок');
    assert.deepEqual(A.network, []);
    assert.deepEqual(B.network, []);
  });
}
