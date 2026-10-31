import { test } from 'node:test';
import assert from 'node:assert/strict';
import { needsPortrait } from '../src/app/orientation.ts';

test('телефон в landscape показывает просьбу повернуть экран', () => {
  assert.equal(needsPortrait({ coarsePointer: true, screenType: 'landscape-primary', screenWidth: 852, screenHeight: 393 }), true);
});
test('портретный экран остаётся доступен при изменении viewport клавиатурой', () => {
  assert.equal(needsPortrait({ coarsePointer: true, screenType: 'portrait-primary', screenWidth: 393, screenHeight: 852 }), false);
});
test('широкий desktop сохраняет мобильное превью без блокировки', () => {
  assert.equal(needsPortrait({ coarsePointer: false, screenType: 'landscape-primary', screenWidth: 1440, screenHeight: 900 }), false);
});
test('fallback для поворота iOS в обе стороны и старого браузера', () => {
  for (const legacyAngle of [90, -90]) assert.equal(needsPortrait({ coarsePointer: true, legacyAngle, screenWidth: 393, screenHeight: 852 }), true);
  assert.equal(needsPortrait({ coarsePointer: true, legacyAngle: 0, screenWidth: 393, screenHeight: 852 }), false);
  assert.equal(needsPortrait({ coarsePointer: true, screenWidth: 852, screenHeight: 393 }), true);
});
