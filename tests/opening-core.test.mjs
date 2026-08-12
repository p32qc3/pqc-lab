import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chooseOpeningMode,
  createOpeningStore,
  localDateKey,
} from '../site/opening-core.js';

test('local date key is stable and zero padded', () => {
  assert.equal(localDateKey(new Date(2026, 7, 12, 9, 30)), '2026-08-12');
});

test('opening mode skips a completed day and reduces requested motion', () => {
  assert.equal(chooseOpeningMode({ completedToday: true, reducedMotion: false }), 'skip');
  assert.equal(chooseOpeningMode({ completedToday: false, reducedMotion: true }), 'reduced');
  assert.equal(chooseOpeningMode({ completedToday: false, reducedMotion: false }), 'full');
});

test('daily store records only the supplied local date key', () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const store = createOpeningStore(storage);
  assert.equal(store.completedToday('2026-08-12'), false);
  assert.equal(store.markComplete('2026-08-12'), true);
  assert.equal(store.completedToday('2026-08-12'), true);
  assert.equal(store.completedToday('2026-08-13'), false);
});

test('daily store fails open when browser storage is blocked', () => {
  const blocked = {
    getItem: () => { throw new Error('blocked'); },
    setItem: () => { throw new Error('blocked'); },
  };
  const store = createOpeningStore(blocked);
  assert.equal(store.completedToday('2026-08-12'), false);
  assert.equal(store.markComplete('2026-08-12'), false);
});
