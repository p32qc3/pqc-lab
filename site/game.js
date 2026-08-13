import {
  createGame,
  duck,
  jump,
  startGame,
  stepGame,
  togglePause,
} from './game-core.js';
import {
  createHighScoreStore,
  formatScore,
  isDuckCommand,
  isDuckReleaseCommand,
  isJumpCommand,
  normalizeFrameDelta,
} from './game-adapter.js';

const canvas = document.querySelector('#runner-canvas');
const context = canvas.getContext('2d');
const startButton = document.querySelector('#game-start');
const jumpButton = document.querySelector('#game-jump');
const duckButton = document.querySelector('#game-duck');
const pauseButton = document.querySelector('#game-pause');
const status = document.querySelector('#game-status');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const compactRendering = window.matchMedia('(max-width: 760px)').matches;
const scoreStore = createHighScoreStore(window.localStorage);
const moonGradient = context.createRadialGradient(780, 70, 8, 780, 70, 76);
moonGradient.addColorStop(0, 'rgba(255,54,165,.34)');
moonGradient.addColorStop(.52, 'rgba(111,31,130,.15)');
moonGradient.addColorStop(.55, 'rgba(255,54,165,.26)');
moonGradient.addColorStop(.58, 'rgba(255,54,165,0)');

let state = createGame();
let highScore = scoreStore.load();
let lastTime = 0;
let animationFrame = 0;
let canvasInView = true;

function drawGrid(elapsed) {
  const gridStep = compactRendering ? 64 : 48;
  const offset = reducedMotion ? 0 : -((elapsed * .06) % gridStep);
  context.save();
  context.strokeStyle = 'rgba(0,234,255,.075)';
  context.lineWidth = 1;
  for (let x = offset; x <= canvas.width; x += gridStep) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height);
    context.stroke();
  }
  for (let y = 0; y <= canvas.height; y += gridStep) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    context.stroke();
  }
  context.restore();
}

function drawChipSkyline() {
  const traces = [
    [20, 246, 90, 246, 90, 214],
    [168, 268, 238, 268, 238, 230],
    [420, 254, 520, 254, 520, 218],
    [680, 262, 782, 262, 782, 226],
  ];
  context.save();
  context.strokeStyle = 'rgba(0,234,255,.18)';
  context.lineWidth = 2;
  for (const [x1, y1, x2, y2, x3, y3] of traces) {
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.lineTo(x3, y3);
    context.stroke();
    context.fillStyle = 'rgba(255,54,165,.32)';
    context.fillRect(x3 - 4, y3 - 4, 8, 8);
  }
  context.restore();
}

function drawMoon() {
  context.fillStyle = moonGradient;
  context.beginPath();
  context.arc(780, 70, 76, 0, Math.PI * 2);
  context.fill();
}

function drawRunner(player) {
  const ducking = player.ducking;
  const bodyHeight = ducking ? 24 : 47;
  const x = player.x;
  const y = state.config.groundY - player.y - bodyHeight;
  const legPhase = state.phase === 'running' && player.y === 0
    ? Math.floor(state.elapsed / 90) % 2
    : 0;

  context.save();
  context.fillStyle = '#00eaff';
  context.shadowColor = '#00eaff';
  context.shadowBlur = compactRendering ? 7 : 14;

  if (ducking) {
    context.fillRect(x + 6, y + 7, 42, 18);
    context.fillRect(x + 34, y, 16, 12);
    context.fillRect(x + 10, y + 23, 24, 5);
  } else {
    context.fillRect(x + 7, y + 16, 29, 23);
    context.fillRect(x + 28, y + 3, 22, 18);
    context.fillRect(x + 12, y + 37, 6, legPhase ? 7 : 11);
    context.fillRect(x + 31, y + 37, 6, legPhase ? 11 : 7);
  }

  context.fillStyle = '#08061c';
  context.fillRect(x + 42, y + (ducking ? 4 : 8), 4, 4);
  context.fillStyle = '#ff36a5';
  context.fillRect(x - 4, y + (ducking ? 13 : 22), 14, 5);
  context.fillRect(x + 13, y + (ducking ? 12 : 21), 7, 3);
  context.restore();
}

function drawScrapChip(obstacle, y) {
  context.fillRect(obstacle.x, y, obstacle.width, obstacle.height);
  context.shadowBlur = 0;
  context.strokeStyle = 'rgba(246,244,255,.55)';
  context.strokeRect(obstacle.x + 5, y + 5, Math.max(2, obstacle.width - 10), Math.max(4, obstacle.height - 10));
  context.fillStyle = '#08061c';
  for (let pin = 4; pin < obstacle.width - 4; pin += 8) {
    context.fillRect(obstacle.x + pin, y - 4, 4, 4);
    context.fillRect(obstacle.x + pin, y + obstacle.height, 4, 4);
  }
}

function drawEWaste(obstacle, y) {
  context.fillRect(obstacle.x, y + 8, obstacle.width, obstacle.height - 8);
  context.fillStyle = '#00eaff';
  context.fillRect(obstacle.x + 8, y, 7, obstacle.height);
  context.fillRect(obstacle.x + obstacle.width - 16, y + 4, 7, obstacle.height - 4);
  context.fillStyle = '#08061c';
  context.fillRect(obstacle.x + 18, y + 17, 10, 4);
}

function drawFlyingWire(obstacle, y) {
  context.strokeStyle = '#ff36a5';
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(obstacle.x, y + obstacle.height / 2);
  context.bezierCurveTo(
    obstacle.x + obstacle.width * .28,
    y - 14,
    obstacle.x + obstacle.width * .62,
    y + obstacle.height + 14,
    obstacle.x + obstacle.width,
    y + obstacle.height / 2,
  );
  context.stroke();
  context.fillStyle = '#00eaff';
  context.fillRect(obstacle.x - 3, y + 3, 6, 8);
  context.fillRect(obstacle.x + obstacle.width - 3, y + 3, 6, 8);
}

function drawLaserLine(obstacle, y) {
  context.fillStyle = '#ff36a5';
  context.fillRect(obstacle.x, y + 4, obstacle.width, 3);
  context.fillStyle = '#00eaff';
  context.fillRect(obstacle.x - 5, y, 10, obstacle.height);
  context.fillRect(obstacle.x + obstacle.width - 5, y, 10, obstacle.height);
}

function drawObstacle(obstacle) {
  const y = state.config.groundY - obstacle.y - obstacle.height;
  context.save();
  context.fillStyle = '#ff36a5';
  context.shadowColor = '#ff36a5';
  context.shadowBlur = compactRendering ? 7 : 14;

  if (obstacle.type === 'e-waste') drawEWaste(obstacle, y);
  else if (obstacle.type === 'flying-wire') drawFlyingWire(obstacle, y);
  else if (obstacle.type === 'laser-line') drawLaserLine(obstacle, y);
  else drawScrapChip(obstacle, y);

  context.restore();
}

function drawScore(current, best) {
  context.save();
  context.font = '18px monospace';
  context.fillStyle = '#f6f4ff';
  context.fillText(`SCORE ${formatScore(current)}`, 24, 32);
  context.fillStyle = '#ff36a5';
  context.textAlign = 'right';
  context.fillText(`HI ${formatScore(best)}`, canvas.width - 24, 32);
  context.restore();
}

function drawOverlay(phase) {
  if (phase === 'running') return;
  const title = phase === 'over' ? 'SIGNAL LOST' : phase === 'paused' ? 'PAUSED' : 'PQC RUNNER';
  const hint = phase === 'over' ? '点击重新开始' : phase === 'paused' ? '点击继续' : 'W 跳跃，按住 S 蹲下';
  context.save();
  context.fillStyle = 'rgba(5,4,23,.74)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.textAlign = 'center';
  context.fillStyle = '#f6f4ff';
  context.font = '700 30px Arial, sans-serif';
  context.fillText(title, canvas.width / 2, 155);
  context.fillStyle = '#00eaff';
  context.font = '16px Arial, sans-serif';
  context.fillText(hint, canvas.width / 2, 190);
  context.restore();
}

function render(current, best) {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#050417';
  context.fillRect(0, 0, canvas.width, canvas.height);
  drawGrid(current.elapsed);
  drawMoon();
  drawChipSkyline();

  context.save();
  context.strokeStyle = '#00eaff';
  context.shadowColor = '#00eaff';
  context.shadowBlur = 10;
  context.beginPath();
  context.moveTo(0, current.config.groundY + .5);
  context.lineTo(canvas.width, current.config.groundY + .5);
  context.stroke();
  context.restore();

  current.obstacles.forEach(drawObstacle);
  drawRunner(current.player);
  drawScore(current.score, best);
  drawOverlay(current.phase);
}

function setStatus(message) {
  status.textContent = message;
}

function scheduleFrame() {
  if (animationFrame || state.phase !== 'running' || !canvasInView || document.hidden) return;
  animationFrame = requestAnimationFrame(frame);
}

function start() {
  state = startGame(state);
  lastTime = performance.now();
  pauseButton.textContent = '暂停';
  setStatus('游戏进行中：跳过废弃芯片，蹲下躲飞线');
  render(state, highScore);
  scheduleFrame();
}

function handleJump() {
  if (state.phase === 'idle' || state.phase === 'over') start();
  state = jump(state);
}

function setDuck(active) {
  state = duck(state, active);
  duckButton.setAttribute('aria-pressed', String(state.player.duckRequested));
}

function releaseDuck() {
  setDuck(false);
}

function pause() {
  if (state.phase === 'idle' || state.phase === 'over') {
    setStatus('游戏尚未开始');
    return;
  }
  state = togglePause(state);
  pauseButton.textContent = state.phase === 'paused' ? '继续' : '暂停';
  setStatus(state.phase === 'paused' ? '游戏已暂停' : '游戏进行中：跳过废弃芯片，蹲下躲飞线');
  lastTime = performance.now();
  render(state, highScore);
  scheduleFrame();
}

function frame(time) {
  animationFrame = 0;
  if (!canvasInView || document.hidden || state.phase !== 'running') return;
  const delta = lastTime ? normalizeFrameDelta(time - lastTime) : 0;
  lastTime = time;
  const previousPhase = state.phase;
  state = stepGame(state, delta);

  if (state.phase === 'over' && previousPhase !== 'over') {
    highScore = scoreStore.save(state.score);
    releaseDuck();
    setStatus(`游戏结束，得分 ${Math.floor(state.score)}。点击重新开始。`);
  }

  render(state, highScore);
  scheduleFrame();
}

function gameIsVisible() {
  const rect = canvas.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < window.innerHeight;
}

startButton.addEventListener('click', start);
pauseButton.addEventListener('click', pause);
canvas.addEventListener('pointerdown', handleJump);
jumpButton.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  handleJump();
});
duckButton.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  try {
    duckButton.setPointerCapture?.(event.pointerId);
  } catch {
    // Synthetic test events may not represent an active platform pointer.
  }
  setDuck(true);
});
duckButton.addEventListener('pointerup', releaseDuck);
duckButton.addEventListener('pointercancel', releaseDuck);
duckButton.addEventListener('lostpointercapture', releaseDuck);
window.addEventListener('blur', releaseDuck);

window.addEventListener('keydown', (event) => {
  if (!gameIsVisible()) return;
  if (isJumpCommand(event)) {
    event.preventDefault();
    handleJump();
  }
  if (isDuckCommand(event)) {
    event.preventDefault();
    setDuck(true);
  }
});

window.addEventListener('keyup', (event) => {
  if (!isDuckReleaseCommand(event)) return;
  event.preventDefault();
  releaseDuck();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    releaseDuck();
    if (state.phase === 'running') pause();
    return;
  }
  lastTime = performance.now();
  if (state.phase === 'running') scheduleFrame();
  else render(state, highScore);
});

if ('IntersectionObserver' in window) {
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    canvasInView = entry.isIntersecting;
    lastTime = performance.now();
    if (canvasInView) {
      if (state.phase === 'running') scheduleFrame();
      else render(state, highScore);
    }
    else {
      releaseDuck();
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
  }, { rootMargin: '120px 0px' });
  visibilityObserver.observe(canvas);
}

render(state, highScore);
