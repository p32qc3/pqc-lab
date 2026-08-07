import {
  createGame,
  jump,
  startGame,
  stepGame,
  togglePause,
} from './game-core.js';
import {
  createHighScoreStore,
  formatScore,
  isJumpCommand,
} from './game-adapter.js';

const canvas = document.querySelector('#runner-canvas');
const context = canvas.getContext('2d');
const startButton = document.querySelector('#game-start');
const pauseButton = document.querySelector('#game-pause');
const status = document.querySelector('#game-status');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const scoreStore = createHighScoreStore(window.localStorage);

let state = createGame();
let highScore = scoreStore.load();
let lastTime = 0;

function drawGrid(elapsed) {
  const offset = reducedMotion ? 0 : -((elapsed * .06) % 48);
  context.save();
  context.strokeStyle = 'rgba(0,234,255,.075)';
  context.lineWidth = 1;
  for (let x = offset; x <= canvas.width; x += 48) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height);
    context.stroke();
  }
  for (let y = 0; y <= canvas.height; y += 48) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    context.stroke();
  }
  context.restore();
}

function drawSkyline() {
  const buildings = [
    [0, 70, 74], [78, 44, 102], [128, 90, 58], [222, 54, 94],
    [280, 76, 66], [360, 48, 112], [412, 92, 52], [510, 58, 83],
    [572, 42, 118], [620, 88, 62], [714, 56, 97], [776, 72, 70],
    [854, 50, 108], [910, 68, 76],
  ];
  context.save();
  context.fillStyle = 'rgba(29,22,62,.58)';
  for (const [x, width, height] of buildings) {
    context.fillRect(x, state.config.groundY - height, width, height);
    context.fillStyle = 'rgba(255,54,165,.18)';
    for (let windowY = state.config.groundY - height + 12; windowY < state.config.groundY - 8; windowY += 18) {
      context.fillRect(x + 10, windowY, 4, 7);
      if (width > 60) context.fillRect(x + 28, windowY, 4, 7);
    }
    context.fillStyle = 'rgba(29,22,62,.58)';
  }
  context.restore();
}

function drawMoon() {
  const gradient = context.createRadialGradient(780, 70, 8, 780, 70, 76);
  gradient.addColorStop(0, 'rgba(255,54,165,.34)');
  gradient.addColorStop(.52, 'rgba(111,31,130,.15)');
  gradient.addColorStop(.55, 'rgba(255,54,165,.26)');
  gradient.addColorStop(.58, 'rgba(255,54,165,0)');
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(780, 70, 76, 0, Math.PI * 2);
  context.fill();
}

function drawRunner(player) {
  const x = player.x;
  const y = state.config.groundY - player.y - player.height;
  const legPhase = state.phase === 'running' && player.y === 0
    ? Math.floor(state.elapsed / 90) % 2
    : 0;

  context.save();
  context.fillStyle = '#00eaff';
  context.shadowColor = '#00eaff';
  context.shadowBlur = 14;
  context.fillRect(x + 7, y + 16, 29, 23);
  context.fillRect(x + 28, y + 3, 22, 18);
  context.fillRect(x + 12, y + 37, 6, legPhase ? 7 : 11);
  context.fillRect(x + 31, y + 37, 6, legPhase ? 11 : 7);
  context.fillStyle = '#08061c';
  context.fillRect(x + 42, y + 8, 4, 4);
  context.fillStyle = '#ff36a5';
  context.fillRect(x - 4, y + 22, 14, 5);
  context.fillRect(x + 13, y + 21, 7, 3);
  context.restore();
}

function drawObstacle(obstacle) {
  const y = state.config.groundY - obstacle.height;
  context.save();
  context.fillStyle = '#ff36a5';
  context.shadowColor = '#ff36a5';
  context.shadowBlur = 14;
  context.fillRect(obstacle.x, y, obstacle.width, obstacle.height);
  context.shadowBlur = 0;
  context.strokeStyle = 'rgba(246,244,255,.55)';
  context.strokeRect(obstacle.x + 5, y + 5, Math.max(2, obstacle.width - 10), Math.max(4, obstacle.height - 10));
  context.fillStyle = '#08061c';
  context.fillRect(obstacle.x + obstacle.width * .35, y, 3, obstacle.height);
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
  const hint = phase === 'over' ? '点击重新开始' : phase === 'paused' ? '点击继续' : '空格 / ↑ / 点击跳跃';
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
  drawSkyline();

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

function start() {
  state = startGame(state);
  lastTime = performance.now();
  pauseButton.textContent = '暂停';
  setStatus('游戏进行中：躲避故障芯片');
  render(state, highScore);
}

function handleJump() {
  if (state.phase === 'idle' || state.phase === 'over') start();
  state = jump(state);
}

function pause() {
  if (state.phase === 'idle' || state.phase === 'over') {
    setStatus('游戏尚未开始');
    return;
  }
  state = togglePause(state);
  pauseButton.textContent = state.phase === 'paused' ? '继续' : '暂停';
  setStatus(state.phase === 'paused' ? '游戏已暂停' : '游戏进行中：躲避故障芯片');
  lastTime = performance.now();
  render(state, highScore);
}

function frame(time) {
  const delta = lastTime ? time - lastTime : 0;
  lastTime = time;
  const previousPhase = state.phase;
  state = stepGame(state, delta);

  if (state.phase === 'over' && previousPhase !== 'over') {
    highScore = scoreStore.save(state.score);
    setStatus(`游戏结束，得分 ${Math.floor(state.score)}。点击重新开始。`);
  }

  render(state, highScore);
  requestAnimationFrame(frame);
}

function gameIsVisible() {
  const rect = canvas.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < window.innerHeight;
}

startButton.addEventListener('click', start);
pauseButton.addEventListener('click', pause);
canvas.addEventListener('pointerdown', handleJump);

window.addEventListener('keydown', (event) => {
  if (!isJumpCommand(event) || !gameIsVisible()) return;
  event.preventDefault();
  handleJump();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.phase === 'running') pause();
});

render(state, highScore);
requestAnimationFrame(frame);
