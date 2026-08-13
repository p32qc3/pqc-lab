import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  duck,
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

test('jumping clears ground obstacles', () => {
  const jumping = {
    ...jump(startGame(createGame({ seed: 7 }))),
    player: {
      ...jump(startGame(createGame({ seed: 7 }))).player,
      y: 90,
      velocityY: 600,
    },
    obstacles: [{ type: 'scrap-chip', x: 125, y: 0, width: 34, height: 46 }],
  };

  assert.equal(stepGame(jumping, 16).phase, 'running');
});

test('ducking lowers the collision body so flying wires can pass overhead', () => {
  const wire = { type: 'flying-wire', x: 125, y: 36, width: 58, height: 14 };
  const standing = {
    ...startGame(createGame({ seed: 7 })),
    obstacles: [wire],
  };
  const crouched = duck(standing, true);

  assert.equal(stepGame(standing, 16).phase, 'over');
  assert.equal(stepGame(crouched, 16).phase, 'running');
});

test('jumping into flying hazards still ends the run', () => {
  const jumping = {
    ...jump(startGame(createGame({ seed: 7 }))),
    player: {
      ...jump(startGame(createGame({ seed: 7 }))).player,
      y: 90,
      velocityY: 600,
    },
    obstacles: [{ type: 'laser-line', x: 125, y: 42, width: 74, height: 10 }],
  };

  assert.equal(stepGame(jumping, 16).phase, 'over');
});

test('held duck request applies on landing and clears even while paused', () => {
  const airborne = jump(startGame(createGame({ seed: 7 })));
  const requested = duck(airborne, true);
  assert.equal(requested.player.ducking, false);
  assert.equal(requested.player.duckRequested, true);

  const landed = stepGame({
    ...requested,
    obstacles: [{ type: 'scrap-chip', x: 5000, y: 0, width: 34, height: 46 }],
  }, 1000);
  assert.equal(landed.player.y, 0);
  assert.equal(landed.player.ducking, true);

  const released = duck(togglePause(landed), false);
  assert.equal(released.player.ducking, false);
  assert.equal(released.player.duckRequested, false);
});

test('time advances score and speed without tunnelling through frames', () => {
  const running = {
    ...startGame(createGame({ seed: 7 })),
    obstacles: [{ type: 'scrap-chip', x: 5000, y: 0, width: 28, height: 48 }],
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
    obstacles: [{ type: 'scrap-chip', x: 125, y: 0, width: 30, height: 50 }],
  };
  assert.equal(stepGame(running, 16).phase, 'over');
});

test('identical seeds produce identical obstacle sequences', () => {
  const first = stepGame({ ...startGame(createGame({ seed: 42 })), obstacles: [] }, 1000);
  const second = stepGame({ ...startGame(createGame({ seed: 42 })), obstacles: [] }, 1000);
  assert.deepEqual(first.obstacles, second.obstacles);
});

test('generated obstacles include ground and airborne hazards', () => {
  const later = stepGame({ ...startGame(createGame({ seed: 19 })), obstacles: [] }, 8000);
  const types = new Set(later.obstacles.map((obstacle) => obstacle.type));

  assert.ok(types.has('scrap-chip') || types.has('e-waste'));
  assert.ok(types.has('flying-wire') || types.has('laser-line'));
  assert.ok(later.obstacles.some((obstacle) => obstacle.y > 0));
});
