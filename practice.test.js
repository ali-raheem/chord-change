import test from 'node:test';
import assert from 'node:assert/strict';
import { makePairs, formatTime, sessionPosition, CHORDS } from './practice.js';

test('generates every unique, unordered pair exactly once without self-pairs', () => {
  const names = CHORDS.map(c => c.name);
  const pairs = makePairs(names);
  assert.equal(pairs.length, names.length * (names.length-1)/2);
  assert.equal(new Set(pairs.map(pair => [...pair].sort().join('|'))).size, pairs.length);
  assert.ok(pairs.every(([a,b]) => a !== b && names.includes(a) && names.includes(b)));
});

test('handles insufficient chords, duplicated selections, and two chords', () => {
  assert.deepEqual(makePairs([]), []);
  assert.deepEqual(makePairs(['C']), []);
  assert.deepEqual(makePairs(['C', 'G', 'C']), [['C','G']]);
});

test('shuffles the order without losing any pair', () => {
  const a = makePairs(['C','G','Am','Em'], () => 0);
  const b = makePairs(['C','G','Am','Em'], () => .999);
  assert.notDeepEqual(a, b);
  assert.deepEqual(a.map(p => p.join('|')).sort(), b.map(p => p.join('|')).sort());
});

test('timer advances at boundaries and catches up after delayed callbacks', () => {
  assert.deepEqual(sessionPosition(0, 60, 6), { index:0, complete:false, remaining:60, progress:0 });
  assert.equal(sessionPosition(59999,60,6).index, 0);
  assert.equal(sessionPosition(60000,60,6).index, 1);
  assert.equal(sessionPosition(60000,60,6).remaining, 60);
  assert.equal(sessionPosition(185000,60,6).index, 3);
  assert.equal(sessionPosition(185000,60,6).remaining, 55);
  assert.deepEqual(sessionPosition(400000,60,6), { index:6, complete:true, remaining:0, progress:1 });
});

test('formats remaining seconds without showing zero early', () => {
  assert.equal(formatTime(60), '1:00');
  assert.equal(formatTime(.1), '0:01');
  assert.equal(formatTime(-1), '0:00');
  assert.equal(formatTime(600), '10:00');
});
