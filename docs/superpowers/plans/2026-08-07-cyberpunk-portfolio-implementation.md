# Cyberpunk Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build, test, package, and publicly publish a privacy-safe cyberpunk portfolio with an original playable obstacle-dodging game.

**Architecture:** A dependency-free static site lives in `site/`. Semantic HTML and CSS render the portfolio, while a small ES-module game core owns deterministic state updates and a Canvas adapter handles drawing, keyboard/touch input, animation, pausing, and local high-score storage. Node's built-in test runner checks structure, privacy rules, and game behavior; GitHub Actions publishes only `site/` to GitHub Pages.

**Tech Stack:** HTML5, CSS3, JavaScript ES modules, Canvas 2D, Node.js built-in `node:test`, GitHub Actions, GitHub Pages.

## Global Constraints

- Use the approved “霓虹都市” cyberpunk visual direction with dark black-purple, cyan, and magenta.
- Do not include full name, photo, GPA, school, department, phone number, email address, or location.
- Public content is limited to projects, work performed, technical capabilities, competition roles, and awards.
- Use `PQC.LAB` as the only site identity.
- Do not load external fonts, images, APIs, analytics, advertising, or tracking scripts.
- Support desktop keyboard controls and mobile touch controls.
- Respect `prefers-reduced-motion` and keep the game usable if local storage is unavailable.
- Publish a public URL that opens without authentication.

---

### Task 1: Privacy-Safe Site Shell

**Files:**
- Create: `package.json`
- Create: `site/index.html`
- Create: `tests/site-contract.test.mjs`

**Interfaces:**
- Consumes: Approved section order and privacy rules from `docs/superpowers/specs/2026-08-07-cyberpunk-portfolio-design.md`.
- Produces: Stable element IDs `projects`, `game`, `skills`, and `awards`; Canvas ID `runner-canvas`; buttons `game-start` and `game-pause` used by later tasks.

- [ ] **Step 1: Write the failing site contract test**

```js
// tests/site-contract.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../site/index.html', import.meta.url), 'utf8');

test('contains every approved section and game control', () => {
  for (const id of ['projects', 'game', 'skills', 'awards', 'runner-canvas', 'game-start', 'game-pause']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
});

test('contains no common private fields or external resources', () => {
  assert.doesNotMatch(html, /GPA|学校|学院|电话|邮箱|所在地|1[3-9]\d{9}|mailto:|https?:\/\//i);
  assert.match(html, /PQC\.LAB/);
});

test('loads only local styles and modules', () => {
  assert.match(html, /href="\.\/styles\.css"/);
  assert.match(html, /src="\.\/app\.js"/);
  assert.match(html, /src="\.\/game\.js"/);
});
```

- [ ] **Step 2: Add the test command and verify the test fails**

```json
{
  "name": "pqc-cyberpunk-portfolio",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/*.test.mjs",
    "serve": "python -m http.server 4173 --directory site"
  }
}
```

Run: `npm test`

Expected: FAIL because `site/index.html` does not exist.

- [ ] **Step 3: Create the semantic page shell**

Create `site/index.html` with:

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="PQC.LAB 项目、技术能力与获奖记录">
  <title>PQC.LAB // Project Archive</title>
  <link rel="stylesheet" href="./styles.css">
</head>
<body>
  <a class="skip-link" href="#projects">跳到主要内容</a>
  <header class="site-header"><a class="brand" href="#top">PQC.LAB</a><nav aria-label="主要导航"><a href="#projects">项目</a><a href="#game">小游戏</a><a href="#skills">能力</a><a href="#awards">奖项</a></nav></header>
  <main id="top">
    <section class="hero" aria-labelledby="hero-title"><p class="eyebrow">EMBEDDED · AI · DATA</p><h1 id="hero-title">BUILD FOR <span>REALITY.</span></h1><p>关注端侧智能、嵌入式原型与数据建模，让算法离开屏幕，在真实世界运行。</p><a class="button" href="#projects">查看代表项目</a></section>
    <section id="projects" aria-labelledby="projects-title"><h2 id="projects-title">代表项目</h2></section>
    <section id="game" aria-labelledby="game-title"><h2 id="game-title">霓虹跑酷</h2><div class="game-frame"><canvas id="runner-canvas" width="960" height="360" aria-label="霓虹机械小兽躲避障碍物的游戏"></canvas><div class="game-controls"><button id="game-start" type="button">开始 / 重新开始</button><button id="game-pause" type="button">暂停</button><p id="game-status" role="status" aria-live="polite">按空格键、向上方向键或点击游戏区域跳跃</p></div></div></section>
    <section id="skills" aria-labelledby="skills-title"><h2 id="skills-title">技术能力</h2></section>
    <section id="awards" aria-labelledby="awards-title"><h2 id="awards-title">项目与获奖记录</h2></section>
  </main>
  <footer><p>PUBLIC PROJECT ARCHIVE // NO PERSONAL CONTACT DATA</p></footer>
  <script type="module" src="./app.js"></script>
  <script type="module" src="./game.js"></script>
</body>
</html>
```

Use the following exact public-safe content inside the empty sections:

```html
<div class="project-grid">
  <article class="project-card project-card--featured"><p class="card-index">PROJECT_001</p><h3>面向听障人士的环境音识别系统</h3><p>负责采声、声音分析、界面、Wi-Fi 与云端连接，并基于 PSoC Edge 完成端侧识别与交互原型。</p><ul class="tag-list"><li>PSoC Edge</li><li>Edge AI</li><li>Wi-Fi</li></ul><p class="award-chip">东部赛区三等奖</p></article>
  <article class="project-card"><p class="card-index">PROJECT_002</p><h3>ParkingE2E 自动泊车模型拓展</h3><p>完成多环境拓展，增强自动泊车轨迹预测模型的适用性。</p><ul class="tag-list"><li>AI</li><li>Trajectory</li></ul><p class="award-chip">市级三等奖</p></article>
  <article class="project-card"><p class="card-index">PROJECT_003</p><h3>青年就业与老龄化数据建模</h3><p>使用随机森林、GWR 与 K-means 完成关系分析并形成建议。</p><ul class="tag-list"><li>Python</li><li>SPSS</li><li>GWR</li></ul><p class="award-chip">市级三等奖</p></article>
</div>

<div class="skill-grid"><article><strong>01</strong><h3>嵌入式系统</h3><p>PSoC Edge、51 单片机、端侧识别与交互原型</p></article><article><strong>02</strong><h3>算法与编程</h3><p>C、C++、Python 与基础算法</p></article><article><strong>03</strong><h3>数据建模</h3><p>MATLAB、Python、SPSS 与 2000+ 组数据处理</p></article><article><strong>04</strong><h3>AI 工程工具</h3><p>使用 Codex、Cursor 与 Claude Code 推进工程工作</p></article></div>

<ol class="award-timeline"><li><time>2026</time><div><h3>嵌入式芯片与系统设计竞赛</h3><p>主要负责人 · 环境音识别与多模态交互 · 东部赛区三等奖</p></div></li><li><time>2026</time><div><h3>计算机设计大赛（人工智能赛道）</h3><p>模型架构与拓展 · 市级三等奖</p></div></li><li><time>2026</time><div><h3>统计建模大赛</h3><p>建模与数据分析 · 市级三等奖</p></div></li><li><time>2025</time><div><h3>数学建模大赛</h3><p>队长、建模与编程 · 处理 2000+ 组数据</p></div></li><li><time>2025</time><div><h3>蓝桥杯 C/C++ 程序设计大赛</h3><p>个人参赛 · 省级三等奖</p></div></li><li><time>—</time><div><h3>奖学金</h3><p>二等奖 1 次、三等奖 2 次</p></div></li></ol>
```

- [ ] **Step 4: Run the site contract test**

Run: `npm test`

Expected: PASS for all three site contract tests.

- [ ] **Step 5: Commit the site shell**

```bash
git add package.json site/index.html tests/site-contract.test.mjs
git commit -m "feat: add privacy-safe portfolio shell"
```

---

### Task 2: Neon City Visual System and Responsive Layout

**Files:**
- Create: `site/styles.css`
- Create: `site/app.js`
- Modify: `tests/site-contract.test.mjs`

**Interfaces:**
- Consumes: Stable section IDs and class names from Task 1.
- Produces: Responsive page layout, navigation state, reduced-motion behavior, and a CSS custom-property palette used by the game frame.

- [ ] **Step 1: Extend the contract test for visual and accessibility requirements**

```js
test('defines the approved palette and responsive safeguards', async () => {
  const css = await readFile(new URL('../site/styles.css', import.meta.url), 'utf8');
  assert.match(css, /--cyan:\s*#00eaff/i);
  assert.match(css, /--magenta:\s*#ff36a5/i);
  assert.match(css, /@media\s*\(max-width:\s*760px\)/i);
  assert.match(css, /prefers-reduced-motion:\s*reduce/i);
});

test('provides a skip link and labelled navigation', () => {
  assert.match(html, /class="skip-link"/);
  assert.match(html, /aria-label="主要导航"/);
});
```

- [ ] **Step 2: Run the tests and verify the palette test fails**

Run: `npm test`

Expected: FAIL because `site/styles.css` does not exist.

- [ ] **Step 3: Implement the visual system**

Create `site/styles.css` with exact root tokens and responsive behavior:

```css
:root {
  --ink: #08061c;
  --panel: #100d2b;
  --text: #f6f4ff;
  --muted: #a7a1be;
  --cyan: #00eaff;
  --magenta: #ff36a5;
  --line: rgba(255, 255, 255, .12);
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; color: var(--text); background: var(--ink); font-family: Arial, "Microsoft YaHei", sans-serif; }
.site-header { position: sticky; top: 0; z-index: 20; display: flex; justify-content: space-between; align-items: center; min-height: 64px; padding: 0 clamp(20px, 5vw, 72px); background: rgba(8, 6, 28, .88); border-bottom: 1px solid var(--line); backdrop-filter: blur(16px); }
.hero { min-height: 78vh; display: grid; align-content: center; padding: clamp(72px, 10vw, 140px) clamp(24px, 8vw, 120px); background: radial-gradient(circle at 78% 18%, rgba(0,234,255,.18), transparent 30%), radial-gradient(circle at 18% 84%, rgba(255,54,165,.16), transparent 30%); }
section { padding: 80px clamp(24px, 8vw, 120px); }
.game-frame { border: 1px solid rgba(0,234,255,.4); background: #050417; box-shadow: 0 0 36px rgba(0,234,255,.08); }
#runner-canvas { display: block; width: 100%; height: auto; touch-action: manipulation; }
@media (max-width: 760px) { .site-header nav { gap: 10px; } section { padding: 56px 20px; } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; animation-duration: .001ms !important; animation-iteration-count: 1 !important; transition-duration: .001ms !important; } }
```

Append these component rules so every approved section has a defined layout and state:

```css
.skip-link { position: fixed; left: 16px; top: -60px; z-index: 100; background: var(--cyan); color: var(--ink); padding: 10px 14px; }
.skip-link:focus { top: 16px; }
.brand { color: var(--text); font-weight: 900; letter-spacing: .08em; text-decoration: none; }
.site-header nav { display: flex; gap: 24px; }
.site-header nav a { color: var(--muted); text-decoration: none; font-size: .82rem; }
.site-header nav a[aria-current] { color: var(--cyan); }
.hero h1 { max-width: 900px; margin: 12px 0; font-size: clamp(3.5rem, 10vw, 8rem); line-height: .86; letter-spacing: -.07em; }
.hero h1 span { color: var(--magenta); text-shadow: 0 0 28px rgba(255,54,165,.34); }
.button, button { border: 1px solid var(--cyan); background: var(--cyan); color: var(--ink); padding: 12px 16px; font-weight: 800; text-decoration: none; cursor: pointer; }
.button:focus-visible, button:focus-visible, a:focus-visible { outline: 3px solid var(--magenta); outline-offset: 4px; }
.project-grid { display: grid; grid-template-columns: 1.2fr .8fr; gap: 14px; }
.project-card { min-height: 230px; padding: 28px; border: 1px solid var(--line); background: rgba(16,13,43,.84); }
.project-card--featured { grid-row: span 2; min-height: 474px; background: linear-gradient(150deg, rgba(0,234,255,.1), rgba(16,13,43,.9) 48%, rgba(255,54,165,.08)); }
.tag-list { display: flex; flex-wrap: wrap; gap: 8px; padding: 0; list-style: none; }
.tag-list li, .award-chip { width: fit-content; border: 1px solid rgba(0,234,255,.28); padding: 6px 9px; color: var(--muted); font-size: .75rem; }
.award-chip { color: var(--magenta); border-color: rgba(255,54,165,.4); }
.skill-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.skill-grid article { padding: 24px; border-top: 1px solid var(--cyan); background: rgba(255,255,255,.025); }
.skill-grid strong { color: var(--magenta); font-family: monospace; }
.award-timeline { max-width: 950px; margin: 0; padding: 0; list-style: none; }
.award-timeline li { display: grid; grid-template-columns: 90px 1fr; gap: 24px; padding: 0 0 30px 24px; border-left: 1px solid rgba(0,234,255,.3); }
.award-timeline time { color: var(--cyan); font-family: monospace; }
.game-controls { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; padding: 14px; border-top: 1px solid var(--line); }
#game-status { flex: 1 1 260px; margin: 0; color: var(--muted); }
footer { padding: 28px; border-top: 1px solid var(--line); color: var(--muted); text-align: center; font-family: monospace; font-size: .75rem; }
@media (max-width: 760px) { .site-header nav a { font-size: 0; } .site-header nav a::first-letter { font-size: .72rem; } .project-grid, .skill-grid { grid-template-columns: 1fr; } .project-card--featured { grid-row: auto; min-height: 320px; } .award-timeline li { grid-template-columns: 58px 1fr; gap: 12px; padding-left: 14px; } }
```

- [ ] **Step 4: Implement minimal navigation behavior**

```js
// site/app.js
const links = [...document.querySelectorAll('.site-header nav a')];
const sections = links.map((link) => document.querySelector(link.hash)).filter(Boolean);
const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    links.forEach((link) => link.toggleAttribute('aria-current', link.hash === `#${entry.target.id}`));
  }
}, { rootMargin: '-40% 0px -50%' });
sections.forEach((section) => observer.observe(section));
```

- [ ] **Step 5: Run tests and commit the responsive visual layer**

Run: `npm test`

Expected: PASS.

```bash
git add site/styles.css site/app.js tests/site-contract.test.mjs
git commit -m "feat: add neon city responsive design"
```

---

### Task 3: Deterministic Game Core

**Files:**
- Create: `site/game-core.js`
- Create: `tests/game-core.test.mjs`

**Interfaces:**
- Consumes: No DOM APIs.
- Produces: `createGame(options)`, `startGame(state)`, `jump(state)`, `togglePause(state)`, `stepGame(state, deltaMs)`, and `rectsOverlap(a, b)` for Task 4.

- [ ] **Step 1: Write failing tests for start, jump, scoring, speed, and collision**

```js
// tests/game-core.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, jump, rectsOverlap, startGame, stepGame, togglePause } from '../site/game-core.js';

test('starts from a clean running state', () => {
  const state = startGame(createGame({ seed: 7 }));
  assert.equal(state.phase, 'running');
  assert.equal(state.score, 0);
  assert.equal(state.player.y, 0);
});

test('jump only applies while grounded', () => {
  const running = startGame(createGame({ seed: 7 }));
  const airborne = jump(running);
  assert.ok(airborne.player.velocityY > 0);
  assert.deepEqual(jump(airborne), airborne);
});

test('advances score and gradually increases speed', () => {
  const running = { ...startGame(createGame({ seed: 7 })), obstacles: [{ x: 5000, y: 0, width: 28, height: 48 }] };
  const later = stepGame(running, 5000);
  assert.ok(later.score >= 50);
  assert.ok(later.speed > running.speed);
});

test('detects overlap and separation', () => {
  assert.equal(rectsOverlap({ x: 0, y: 0, width: 10, height: 10 }, { x: 9, y: 9, width: 10, height: 10 }), true);
  assert.equal(rectsOverlap({ x: 0, y: 0, width: 10, height: 10 }, { x: 11, y: 0, width: 10, height: 10 }), false);
});

test('paused games do not advance', () => {
  const paused = togglePause(startGame(createGame({ seed: 7 })));
  assert.deepEqual(stepGame(paused, 1000), paused);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test tests/game-core.test.mjs`

Expected: FAIL because `site/game-core.js` does not exist.

- [ ] **Step 3: Implement immutable game state updates**

Implement `site/game-core.js` with these exact defaults and exported signatures:

```js
const DEFAULTS = { width: 960, groundY: 300, gravity: -2200, jumpVelocity: 820, startSpeed: 340, maxSpeed: 760 };

export function createGame({ seed = 1 } = {}) {
  return { phase: 'idle', score: 0, elapsed: 0, speed: DEFAULTS.startSpeed, seed, player: { x: 120, y: 0, velocityY: 0, width: 44, height: 46 }, obstacles: [{ x: 980, y: 0, width: 28, height: 48 }], config: DEFAULTS };
}

export function startGame(state) {
  return { ...createGame({ seed: state.seed }), phase: 'running' };
}

export function jump(state) {
  if (state.phase !== 'running' || state.player.y !== 0) return state;
  return { ...state, player: { ...state.player, velocityY: state.config.jumpVelocity } };
}

export function togglePause(state) {
  if (state.phase === 'running') return { ...state, phase: 'paused' };
  if (state.phase === 'paused') return { ...state, phase: 'running' };
  return state;
}

export function rectsOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
```

Add the following deterministic update helpers and export. The outer function consumes long durations in 50 ms chunks so browser stalls cannot skip collisions:

```js
function nextRandom(seed) {
  const nextSeed = (seed * 1664525 + 1013904223) >>> 0;
  return [nextSeed, nextSeed / 4294967296];
}

function advanceFrame(state, deltaMs) {
  const dt = deltaMs / 1000;
  const velocityY = state.player.velocityY + state.config.gravity * dt;
  const y = Math.max(0, state.player.y + state.player.velocityY * dt + .5 * state.config.gravity * dt * dt);
  const player = { ...state.player, y, velocityY: y === 0 ? 0 : velocityY };
  const speed = Math.min(state.config.maxSpeed, state.speed + 6 * dt);
  let obstacles = state.obstacles.map((obstacle) => ({ ...obstacle, x: obstacle.x - speed * dt })).filter((obstacle) => obstacle.x + obstacle.width > -10);
  let seed = state.seed;
  const last = obstacles.at(-1);
  if (!last || last.x < state.config.width - 320) {
    let random;
    [seed, random] = nextRandom(seed);
    const height = 34 + Math.floor(random * 34);
    [seed, random] = nextRandom(seed);
    obstacles.push({ x: state.config.width + 120 + random * 180, y: 0, width: 24 + Math.floor(random * 12), height });
  }
  const playerRect = { x: player.x + 7, y: player.y + 2, width: player.width - 12, height: player.height - 4 };
  const hit = obstacles.some((obstacle) => rectsOverlap(playerRect, obstacle));
  return { ...state, seed, player, obstacles, speed, elapsed: state.elapsed + deltaMs, score: state.score + dt * 10, phase: hit ? 'over' : state.phase };
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
```

- [ ] **Step 4: Run the focused and full test suites**

Run: `node --test tests/game-core.test.mjs`

Expected: PASS.

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Commit the game core**

```bash
git add site/game-core.js tests/game-core.test.mjs
git commit -m "feat: add tested runner game core"
```

---

### Task 4: Canvas Rendering, Controls, and High Score

**Files:**
- Create: `site/game.js`
- Create: `tests/game-adapter-contract.test.mjs`

**Interfaces:**
- Consumes: All exports from `site/game-core.js` and Task 1 DOM IDs.
- Produces: A playable game with `start`, `pause`, keyboard, pointer, visibility pause, resize-safe Canvas rendering, and local high score under key `pqc-runner-high-score-v1`.

- [ ] **Step 1: Write the failing adapter contract test**

```js
// tests/game-adapter-contract.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const game = await readFile(new URL('../site/game.js', import.meta.url), 'utf8');

test('wires every required control and safe score storage', () => {
  assert.match(game, /runner-canvas/);
  assert.match(game, /game-start/);
  assert.match(game, /game-pause/);
  assert.match(game, /keydown/);
  assert.match(game, /pointerdown/);
  assert.match(game, /visibilitychange/);
  assert.match(game, /pqc-runner-high-score-v1/);
  assert.match(game, /try\s*\{/);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test tests/game-adapter-contract.test.mjs`

Expected: FAIL because `site/game.js` does not exist.

- [ ] **Step 3: Implement the browser adapter**

Create `site/game.js` that:

```js
import { createGame, jump, startGame, stepGame, togglePause } from './game-core.js';

const canvas = document.querySelector('#runner-canvas');
const context = canvas.getContext('2d');
const startButton = document.querySelector('#game-start');
const pauseButton = document.querySelector('#game-pause');
const status = document.querySelector('#game-status');
const storageKey = 'pqc-runner-high-score-v1';
let state = createGame();
let highScore = loadHighScore();
let lastTime = 0;

function loadHighScore() {
  try { return Number.parseInt(localStorage.getItem(storageKey) || '0', 10) || 0; }
  catch { return 0; }
}

function saveHighScore(score) {
  highScore = Math.max(highScore, Math.floor(score));
  try { localStorage.setItem(storageKey, String(highScore)); } catch { /* game remains playable */ }
}
```

Append these rendering, loop, and control functions:

```js
function drawGrid() {
  context.strokeStyle = 'rgba(0,234,255,.08)';
  context.lineWidth = 1;
  for (let x = 0; x <= canvas.width; x += 48) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, canvas.height); context.stroke(); }
  for (let y = 0; y <= canvas.height; y += 48) { context.beginPath(); context.moveTo(0, y); context.lineTo(canvas.width, y); context.stroke(); }
}

function drawRunner(player) {
  const ground = state.config.groundY;
  const x = player.x;
  const y = ground - player.y - player.height;
  context.fillStyle = '#00eaff';
  context.shadowColor = '#00eaff';
  context.shadowBlur = 14;
  context.fillRect(x + 7, y + 16, 28, 23);
  context.fillRect(x + 27, y + 3, 23, 18);
  context.fillRect(x + 13, y + 37, 6, 10);
  context.fillRect(x + 31, y + 37, 6, 10);
  context.fillStyle = '#08061c';
  context.fillRect(x + 42, y + 8, 4, 4);
  context.fillStyle = '#ff36a5';
  context.fillRect(x - 4, y + 22, 14, 5);
  context.shadowBlur = 0;
}

function render(current, best) {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#050417';
  context.fillRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  context.strokeStyle = '#00eaff';
  context.shadowColor = '#00eaff';
  context.shadowBlur = 10;
  context.beginPath();
  context.moveTo(0, current.config.groundY);
  context.lineTo(canvas.width, current.config.groundY);
  context.stroke();
  context.shadowBlur = 0;
  for (const obstacle of current.obstacles) {
    context.fillStyle = '#ff36a5';
    context.shadowColor = '#ff36a5';
    context.shadowBlur = 12;
    context.fillRect(obstacle.x, current.config.groundY - obstacle.height, obstacle.width, obstacle.height);
  }
  context.shadowBlur = 0;
  drawRunner(current.player);
  context.fillStyle = '#f6f4ff';
  context.font = '18px monospace';
  context.fillText(`SCORE ${String(Math.floor(current.score)).padStart(5, '0')}`, 24, 32);
  context.fillStyle = '#ff36a5';
  context.fillText(`HI ${String(best).padStart(5, '0')}`, canvas.width - 140, 32);
  if (current.phase !== 'running') {
    context.fillStyle = 'rgba(5,4,23,.72)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#f6f4ff';
    context.textAlign = 'center';
    context.font = '700 28px Arial';
    context.fillText(current.phase === 'over' ? 'SIGNAL LOST' : current.phase === 'paused' ? 'PAUSED' : 'PQC RUNNER', canvas.width / 2, 155);
    context.font = '16px Arial';
    context.fillStyle = '#00eaff';
    context.fillText(current.phase === 'over' ? '点击重新开始' : '空格 / ↑ / 点击跳跃', canvas.width / 2, 188);
    context.textAlign = 'start';
  }
}

function setStatus(message) { status.textContent = message; }

function start() {
  state = startGame(state);
  lastTime = performance.now();
  setStatus('游戏进行中：躲避故障芯片');
  pauseButton.textContent = '暂停';
}

function handleJump() {
  if (state.phase === 'idle' || state.phase === 'over') start();
  state = jump(state);
}

function pause() {
  state = togglePause(state);
  pauseButton.textContent = state.phase === 'paused' ? '继续' : '暂停';
  setStatus(state.phase === 'paused' ? '游戏已暂停' : '游戏进行中');
  lastTime = performance.now();
}

function frame(time) {
  const delta = lastTime ? time - lastTime : 0;
  lastTime = time;
  const previousPhase = state.phase;
  state = stepGame(state, delta);
  if (state.phase === 'over' && previousPhase !== 'over') {
    saveHighScore(state.score);
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
  if (!['Space', 'ArrowUp'].includes(event.code) || event.repeat || !gameIsVisible()) return;
  event.preventDefault();
  handleJump();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.phase === 'running') pause();
});
render(state, highScore);
requestAnimationFrame(frame);
```

- [ ] **Step 4: Run the adapter and full test suites**

Run: `node --test tests/game-adapter-contract.test.mjs`

Expected: PASS.

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Commit the playable game**

```bash
git add site/game.js tests/game-adapter-contract.test.mjs
git commit -m "feat: add playable neon runner"
```

---

### Task 5: Browser Verification and Privacy Audit

**Files:**
- Create: `tests/browser-smoke.mjs`
- Modify: `package.json`
- Modify: `site/styles.css` only if the rendered checks expose defects.
- Modify: `site/game.js` only if gameplay checks expose defects.

**Interfaces:**
- Consumes: The complete local website from Tasks 1-4.
- Produces: Automated desktop/mobile smoke checks and zero known privacy, layout, or gameplay defects.

- [ ] **Step 1: Add a browser smoke test**

Create this exact smoke test and add `"test:browser": "node tests/browser-smoke.mjs"` to `package.json`:

```js
// tests/browser-smoke.mjs
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true });
try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await desktop.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
  for (const id of ['projects', 'game', 'skills', 'awards']) assert.equal(await desktop.locator(`#${id}`).count(), 1);
  await desktop.locator('#game-start').click();
  await desktop.locator('#runner-canvas').scrollIntoViewIfNeeded();
  await desktop.keyboard.press('Space');
  await desktop.waitForTimeout(120);
  assert.match(await desktop.locator('#game-status').innerText(), /游戏进行中/);
  assert.equal(await desktop.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
  console.log('desktop: pass');

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await mobile.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
  await mobile.locator('#runner-canvas').tap();
  await mobile.waitForTimeout(120);
  assert.match(await mobile.locator('#game-status').innerText(), /游戏进行中/);
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
  console.log('mobile: pass');
  console.log('game controls: pass');
} finally {
  await browser.close();
}
```

- [ ] **Step 2: Start the local site and run desktop/mobile smoke checks**

Run in a persistent terminal: `npm run serve`

Run: `node tests/browser-smoke.mjs`

Expected: `desktop: pass`, `mobile: pass`, `game controls: pass`, and exit code 0.

- [ ] **Step 3: Run the complete automated test suite**

Run: `npm test`

Expected: All tests PASS.

- [ ] **Step 4: Run the private-value scan without storing those values in the public repository**

Run a local search over `site/` for every exact private value found in the source resume, plus the generic patterns `GPA`, `学校`, `学院`, `电话`, `邮箱`, `mailto:`, and eleven-digit mainland mobile numbers.

Expected: No matches. Do not save the exact private values in a file, test, commit, or command transcript intended for publication.

- [ ] **Step 5: Render desktop and mobile screenshots and inspect them**

Capture 1440x1000 and 390x844 full-page screenshots under `work/qa/`. Confirm no clipped text, overlap, unreadable contrast, broken Canvas scaling, or horizontal scroll.

- [ ] **Step 6: Commit verification coverage**

```bash
git add tests/browser-smoke.mjs package.json site/styles.css site/game.js
git commit -m "test: verify portfolio across desktop and mobile"
```

---

### Task 6: Package and Publish the Public Site

**Files:**
- Create: `.github/workflows/pages.yml`
- Create: `README.md`
- Create: `outputs/pqc-lab-portfolio.zip`

**Interfaces:**
- Consumes: Verified `site/` directory and authenticated GitHub account.
- Produces: Public repository `p32qc3/pqc-lab`, GitHub Pages deployment, shareable URL `https://p32qc3.github.io/pqc-lab/`, and a downloadable ZIP copy.

- [ ] **Step 1: Add the Pages workflow**

```yaml
name: Deploy GitHub Pages
on:
  push:
    branches: [master]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: site
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Add a concise public README**

Create `README.md` with this public-safe content:

```markdown
# PQC.LAB

赛博朋克风格的项目与获奖展示网站，包含原创的“霓虹跑酷”小游戏。

## 内容

- 嵌入式、AI 与数据建模项目
- 技术能力与竞赛获奖记录
- 支持电脑和手机的 Canvas 跑酷游戏

## 游戏操作

- 电脑：空格键或向上方向键跳跃
- 手机：点击游戏区域跳跃
- 暂停：使用游戏下方的暂停按钮

## 本地查看

`npm run serve`

## 检查

`npm test`

## 隐私

网站不展示照片、完整姓名、学校、GPA、电话、邮箱、所在地或其他联系信息，也不接入统计和跟踪服务。
```

- [ ] **Step 3: Re-run tests and create the ZIP deliverable**

Run: `npm test`

Expected: PASS.

Create `outputs/pqc-lab-portfolio.zip` containing only the files inside `site/`, with `index.html` at the ZIP root.

- [ ] **Step 4: Create or connect the public repository**

Check first: `gh repo view p32qc3/pqc-lab --json nameWithOwner,visibility`

If it does not exist, run: `gh repo create p32qc3/pqc-lab --public --source . --remote origin --push`

If it exists, confirm it is the intended portfolio repository before pushing the current `master` branch to its `origin` remote.

- [ ] **Step 5: Enable workflow-based Pages and wait for deployment**

Run: `gh api --method POST repos/p32qc3/pqc-lab/pages -f build_type=workflow`

If Pages already exists, run: `gh api --method PUT repos/p32qc3/pqc-lab/pages -f build_type=workflow`

Wait for the `Deploy GitHub Pages` workflow to finish successfully.

- [ ] **Step 6: Verify the public site without authentication**

Open `https://p32qc3.github.io/pqc-lab/` in a fresh browser context. Confirm HTTP 200, visible projects and awards, no private fields, working keyboard/touch game controls, and no console errors.

- [ ] **Step 7: Commit any final metadata and report the result**

```bash
git add .github/workflows/pages.yml README.md outputs/pqc-lab-portfolio.zip
git commit -m "chore: publish portfolio to GitHub Pages"
git push origin master
```

Report the verified public URL and ZIP path only after the deployment and public smoke check pass.
