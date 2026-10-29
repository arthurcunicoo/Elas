import assert from 'node:assert/strict';
import { focusPixelOffset, detailPanelMaxHeight } from '../features/map/viewport.ts';
import { displayTime } from '../lib/displayTime.ts';

// The pin must sit in the visible map, for both a compact and expanded panel.
for (const height of [480, 600, 800]) {
  const top = 180, maximum = detailPanelMaxHeight(height, top);
  assert.ok(height - top - maximum >= 112);
  for (const panel of [Math.min(220, maximum), maximum]) {
    const bottom = panel + 24;
    const pinY = height / 2 - focusPixelOffset(height, top, bottom);
    assert.ok(pinY >= top && pinY <= height - bottom);
    assert.ok(pinY - 54 >= top, 'the full marker must clear the search overlay');
  }
}
assert.equal(focusPixelOffset(600, 0, 0), 0);
assert.ok(Number.isFinite(focusPixelOffset(600, 900, 900)));
assert.equal(detailPanelMaxHeight(300, 200), 128);
const now = Date.UTC(2026, 9, 13, 12);
assert.equal(displayTime('invalid', now), '');
assert.equal(displayTime(new Date(now - 20_000).toISOString(), now), 'Agora');
assert.equal(displayTime(new Date(now - 120_000).toISOString(), now), 'Há 2 min');
assert.equal(displayTime(new Date(now - 7_200_000).toISOString(), now), 'Há 2 h');
assert.ok(!displayTime(new Date(now + 120_000).toISOString(), now).startsWith('Há'));
assert.ok(!displayTime(new Date(now - 172_800_000).toISOString(), now).startsWith('Há'));
console.log('Mobile checks passed: selected pin outside panels, short viewport bounds and notification timestamps.');
