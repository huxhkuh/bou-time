import test from 'node:test';
import assert from 'node:assert/strict';
import { displayClock } from '../src/display-clock.js';

function fixture() {
  const owner = new EventTarget();
  owner.document = new EventTarget();
  owner.document.hidden = false;
  const pending = new Map();
  let time = 120123, id = 0;
  owner.setTimeout = (callback, delay) => { pending.set(++id, { callback, delay }); return id; };
  owner.clearTimeout = id => pending.delete(id);
  return { owner, pending, now: () => time, set: n => { time = n; }, fire: () => {
    const [key, task] = pending.entries().next().value;
    pending.delete(key); task.callback();
  } };
}

test('display clock schedules second boundaries from timestamps and catches up after sleep', () => {
  const f = fixture(), values = [];
  const stop = displayClock(f.owner, n => values.push(n), 1000, f.now);
  assert.deepEqual(values, [120123]);
  assert.equal([...f.pending.values()][0].delay, 877);
  f.set(180456); f.fire();
  assert.equal(values.at(-1), 180456);
  assert.equal(f.pending.size, 1);
  assert.equal([...f.pending.values()][0].delay, 544);
  stop(); assert.equal(f.pending.size, 0);
});

test('hidden displays stop work, focus/visibility restore the exact current time and cleanup removes listeners', () => {
  const f = fixture(), values = [];
  const stop = displayClock(f.owner, n => values.push(n), 1000, f.now);
  f.owner.document.hidden = true;
  f.owner.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(f.pending.size, 0);
  f.set(999999);
  f.owner.dispatchEvent(new Event('focus'));
  assert.equal(values.length, 1);
  f.owner.document.hidden = false;
  f.owner.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(values.at(-1), 999999);
  f.owner.dispatchEvent(new Event('focus'));
  assert.equal(f.pending.size, 1);
  stop();
  const count = values.length;
  f.owner.dispatchEvent(new Event('focus'));
  f.owner.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(values.length, count);
  assert.equal(f.pending.size, 0);
});

test('idle or paused displays use minute boundaries, including midnight, with immediate focus refresh', () => {
  const f = fixture(), values = [];
  const stop = displayClock(f.owner, n => values.push(n), 60000, f.now);
  assert.equal([...f.pending.values()][0].delay, 59877);
  f.set(Date.parse('2026-09-09T21:00:00Z')); f.fire();
  assert.equal(values.at(-1), f.now());
  f.set(f.now() + 43200000); f.owner.dispatchEvent(new Event('focus'));
  assert.equal(values.at(-1), f.now());
  stop();
});
