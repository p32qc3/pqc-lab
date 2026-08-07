const DEFAULTS = Object.freeze({
  width: 960,
  groundY: 300,
  gravity: -2200,
  jumpVelocity: 820,
  startSpeed: 340,
  maxSpeed: 760,
});

export function createGame({ seed = 1 } = {}) {
  return {
    phase: 'idle',
    score: 0,
    elapsed: 0,
    speed: DEFAULTS.startSpeed,
    seed,
    player: {
      x: 120,
      y: 0,
      velocityY: 0,
      width: 50,
      height: 47,
    },
    obstacles: [{ x: DEFAULTS.width + 120, y: 0, width: 28, height: 48 }],
    config: DEFAULTS,
  };
}

export function startGame(state) {
  return { ...createGame({ seed: state.seed }), phase: 'running' };
}

export function jump(state) {
  if (state.phase !== 'running' || state.player.y !== 0 || state.player.velocityY !== 0) {
    return state;
  }
  return {
    ...state,
    player: { ...state.player, velocityY: state.config.jumpVelocity },
  };
}

export function togglePause(state) {
  if (state.phase === 'running') return { ...state, phase: 'paused' };
  if (state.phase === 'paused') return { ...state, phase: 'running' };
  return state;
}

export function rectsOverlap(a, b) {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
}

function nextRandom(seed) {
  const nextSeed = (seed * 1664525 + 1013904223) >>> 0;
  return [nextSeed, nextSeed / 4294967296];
}

function spawnObstacle(state, obstacles, seed) {
  const last = obstacles.at(-1);
  if (last && last.x >= state.config.width - 320) return { obstacles, seed };

  let random;
  [seed, random] = nextRandom(seed);
  const height = 34 + Math.floor(random * 34);
  [seed, random] = nextRandom(seed);
  const width = 23 + Math.floor(random * 12);
  [seed, random] = nextRandom(seed);
  const gap = 115 + random * 190;

  return {
    seed,
    obstacles: [...obstacles, {
      x: state.config.width + gap,
      y: 0,
      width,
      height,
    }],
  };
}

function advanceFrame(state, deltaMs) {
  const dt = deltaMs / 1000;
  const velocityY = state.player.velocityY + state.config.gravity * dt;
  const nextY = state.player.y
    + state.player.velocityY * dt
    + .5 * state.config.gravity * dt * dt;
  const y = Math.max(0, nextY);
  const player = {
    ...state.player,
    y,
    velocityY: y === 0 ? 0 : velocityY,
  };
  const speed = Math.min(state.config.maxSpeed, state.speed + 6 * dt);
  let obstacles = state.obstacles
    .map((obstacle) => ({ ...obstacle, x: obstacle.x - speed * dt }))
    .filter((obstacle) => obstacle.x + obstacle.width > -10);

  const spawned = spawnObstacle(state, obstacles, state.seed);
  obstacles = spawned.obstacles;

  const playerRect = {
    x: player.x + 7,
    y: player.y + 2,
    width: player.width - 12,
    height: player.height - 4,
  };
  const hit = obstacles.some((obstacle) => rectsOverlap(playerRect, obstacle));

  return {
    ...state,
    seed: spawned.seed,
    player,
    obstacles,
    speed,
    elapsed: state.elapsed + deltaMs,
    score: state.score + dt * 10,
    phase: hit ? 'over' : state.phase,
  };
}

export function stepGame(state, deltaMs) {
  if (state.phase !== 'running' || deltaMs <= 0) return state;

  let next = state;
  let remaining = Math.min(deltaMs, 10000);
  while (remaining > 0 && next.phase === 'running') {
    const frameMs = Math.min(remaining, 50);
    next = advanceFrame(next, frameMs);
    remaining -= frameMs;
  }
  return next;
}
