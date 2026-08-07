import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  jump,
  rectsOverlap,
  startGame,
  stepGame,
  togglePause,
} from '../site/game-core.js';

test('start resets a finished run to a clean running state', () => {
  const finished = { ...createGame({ seed: 7 }), phase: 'over', score: 96 };
  const state = startGame(finished);
  assert.equal(state.phase, 'running');
  assert.equal(state.score, 0);
  assert.equal(state.player.y, 0);
});

test('jump applies upward velocity once while grounded', () => {
  const running = startGame(createGame({ seed: 7 }));
  const airborne = jump(running);
  assert.ok(airborne.player.velocityY > 0);
  assert.deepEqual(jump(airborne), airborne);
});

test('time advances score and speed without tunnelling through frames', () => {
  const running = {
    ...startGame(createGame({ seed: 7 })),
    obstacles: [{ x: 5000, y: 0, width: 28, height: 48 }],
  };
  const later = stepGame(running, 5000);
  assert.equal(Math.floor(later.score), 50);
  assert.ok(later.speed > running.speed);
});

test('rectangle overlap distinguishes contact from separation', () => {
  assert.equal(rectsOverlap(
    { x: 0, y: 0, width: 10, height: 10 },
    { x: 9, y: 9, width: 10, height: 10 },
  ), true);
  assert.equal(rectsOverlap(
    { x: 0, y: 0, width: 10, height: 10 },
    { x: 11, y: 0, width: 10, height: 10 },
  ), false);
});

test('paused games do not advance', () => {
  const paused = togglePause(startGame(createGame({ seed: 7 })));
  assert.deepEqual(stepGame(paused, 1000), paused);
});

test('colliding with an obstacle ends the run', () => {
  const running = {
    ...startGame(createGame({ seed: 7 })),
    obstacles: [{ x: 125, y: 0, width: 30, height: 50 }],
  };
  assert.equal(stepGame(running, 16).phase, 'over');
});

test('identical seeds produce identical obstacle sequences', () => {
  const first = stepGame({ ...startGame(createGame({ seed: 42 })), obstacles: [] }, 1000);
  const second = stepGame({ ...startGame(createGame({ seed: 42 })), obstacles: [] }, 1000);
  assert.deepEqual(first.obstacles, second.obstacles);
});
