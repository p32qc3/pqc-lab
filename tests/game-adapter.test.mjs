import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createHighScoreStore,
  formatScore,
  isDuckCommand,
  isDuckReleaseCommand,
  isJumpCommand,
} from '../site/game-adapter.js';

test('high score store keeps the greatest completed score', () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const scores = createHighScoreStore(storage);
  assert.equal(scores.load(), 0);
  assert.equal(scores.save(37.9), 37);
  assert.equal(scores.save(12), 37);
  assert.equal(scores.load(), 37);
});

test('high score store falls back safely when storage is blocked', () => {
  const blocked = {
    getItem: () => { throw new Error('blocked'); },
    setItem: () => { throw new Error('blocked'); },
  };
  const scores = createHighScoreStore(blocked);
  assert.equal(scores.load(), 0);
  assert.equal(scores.save(24), 24);
});

test('jump command leads with W and keeps compatible controls', () => {
  assert.equal(isJumpCommand({ code: 'KeyW', repeat: false }), true);
  assert.equal(isJumpCommand({ code: 'Space', repeat: false }), true);
  assert.equal(isJumpCommand({ code: 'ArrowUp', repeat: false }), true);
  assert.equal(isJumpCommand({ code: 'KeyW', repeat: true }), false);
  assert.equal(isJumpCommand({ code: 'Enter', repeat: false }), false);
});

test('duck press and release accept S and ArrowDown', () => {
  assert.equal(isDuckCommand({ code: 'KeyS', repeat: false }), true);
  assert.equal(isDuckCommand({ code: 'ArrowDown', repeat: false }), true);
  assert.equal(isDuckCommand({ code: 'KeyS', repeat: true }), false);
  assert.equal(isDuckReleaseCommand({ code: 'KeyS' }), true);
  assert.equal(isDuckReleaseCommand({ code: 'ArrowDown' }), true);
  assert.equal(isDuckReleaseCommand({ code: 'Space' }), false);
});

test('score display is padded and integer-only', () => {
  assert.equal(formatScore(42.9), '00042');
  assert.equal(formatScore(-2), '00000');
  assert.equal(formatScore(123456), '99999');
});
