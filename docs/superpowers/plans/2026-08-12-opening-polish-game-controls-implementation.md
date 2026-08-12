# PQC.LAB Opening, Polish, and Game Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the approved “Chip Awakening” daily opening, visually polish the portfolio, make the runner smoother, and provide W/S plus clear mobile touch controls without exposing additional private information.

**Architecture:** Add a small pure opening-state module and a DOM opening controller, following the existing `game-core.js` / adapter separation so daily behavior can be unit-tested. Extend the existing page script for reveal and background motion, keep game rules in `game-core.js`, and keep keyboard/touch/timing normalization in `game-adapter.js` and `game.js`. The site remains a dependency-free static GitHub Pages bundle.

**Tech Stack:** Semantic HTML, CSS animations, browser ES modules, Canvas 2D, Node built-in test runner, Playwright browser smoke checks, GitHub Pages.

## Global Constraints

- Opening option is A, “Chip Awakening,” and lasts approximately three seconds on the first visit of each local day.
- Opening must have a visible `跳过动画` control and a reduced-motion fallback.
- Do not add video, external fonts, external animation assets, runtime fetches, WebSockets, EventSource, or server dependencies.
- Preserve `潘泉承`, `上海理工大学`, `PQC.LAB`, `panquancheng2006@163.com`, the Edgi-Talk link, and `东部赛区二等奖`.
- Continue hiding portrait, GPA, phone number, address, QQ email, and detailed college/department.
- Primary desktop controls are W to jump and held S to duck; Space/ArrowUp and ArrowDown remain secondary controls.
- Mobile controls are labeled `跳跃` and `蹲下`; duck stays active only while its pointer is held.
- Ground obstacles require jumping; flying wire and laser obstacles require ducking.
- Publish to the existing GitHub Pages site.
- Final ZIP must exist only at `H:\YINGSI\简历\pqc-lab-portfolio.zip`; remove the C: project ZIP.

---

## File Map

- Create `site/opening-core.js`: pure local-date, daily-store, and opening-mode decisions.
- Create `site/opening.js`: DOM lifecycle for play, skip, finish, storage fallback, and ready event.
- Create `tests/opening-core.test.mjs`: deterministic opening behavior tests.
- Modify `site/index.html`: opening markup, reveal hooks, W/S copy, and mobile action buttons.
- Modify `site/styles.css`: opening animation, visual polish, reveal effects, responsive controls, and motion fallbacks.
- Modify `site/app.js`: reveal observer, background throttling guard, and hidden-page motion state.
- Modify `site/game-adapter.js`: W/S mapping, duck release mapping, and frame-delta normalization.
- Modify `site/game.js`: mobile pointer controls, release safety, offscreen work reduction, and cached drawing values.
- Modify `tests/game-adapter.test.mjs`: W/S, key release, and delta normalization tests.
- Modify `tests/site-contract.test.mjs`: opening, controls, local-only assets, identity, and privacy contracts.
- Modify `tests/browser-smoke.mjs`: opening, revisit, desktop W/S, mobile press/hold, reveal, layout, and sustained-frame checks.
- Modify `README.md`: new opening and desktop/mobile instructions.

---

### Task 1: Daily Opening Decision Core

**Files:**
- Create: `site/opening-core.js`
- Create: `tests/opening-core.test.mjs`

**Interfaces:**
- Produces: `localDateKey(date?: Date): string`
- Produces: `chooseOpeningMode({ completedToday: boolean, reducedMotion: boolean }): 'skip' | 'reduced' | 'full'`
- Produces: `createOpeningStore(storage?: Storage, key?: string): { completedToday(dateKey: string): boolean, markComplete(dateKey: string): boolean }`
- Consumes: no browser DOM; storage is passed in so blocked storage can be tested.

- [ ] **Step 1: Write the failing opening-core tests**

```js
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
```

- [ ] **Step 2: Run the test and verify the expected failure**

Run: `node --test tests/opening-core.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `site/opening-core.js`.

- [ ] **Step 3: Implement the pure opening core**

```js
const DEFAULT_KEY = 'pqc-opening-completed-date-v1';

function pad(value) {
  return String(value).padStart(2, '0');
}

export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function chooseOpeningMode({ completedToday, reducedMotion }) {
  if (completedToday) return 'skip';
  return reducedMotion ? 'reduced' : 'full';
}

export function createOpeningStore(storage, key = DEFAULT_KEY) {
  return {
    completedToday(dateKey) {
      try {
        return storage?.getItem(key) === dateKey;
      } catch {
        return false;
      }
    },
    markComplete(dateKey) {
      try {
        storage?.setItem(key, dateKey);
        return Boolean(storage);
      } catch {
        return false;
      }
    },
  };
}
```

- [ ] **Step 4: Run focused and full tests**

Run: `node --test tests/opening-core.test.mjs`

Expected: 4 tests PASS.

Run: `npm.cmd test`

Expected: all existing and new tests PASS.

- [ ] **Step 5: Commit the opening core**

```powershell
git add -- site/opening-core.js tests/opening-core.test.mjs
git commit -m "feat: add daily opening state"
```

---

### Task 2: Chip Awakening Opening UI

**Files:**
- Create: `site/opening.js`
- Modify: `site/index.html:10-18, 130-131`
- Modify: `site/styles.css:1-110, 839-846`
- Modify: `tests/site-contract.test.mjs:8-45`
- Modify: `tests/browser-smoke.mjs:28-45`

**Interfaces:**
- Consumes: `localDateKey`, `chooseOpeningMode`, and `createOpeningStore` from `opening-core.js`.
- Produces: DOM event `pqc:opening-complete`, body class `opening-complete`, and overlay state `#site-opening[hidden]` after completion.
- Produces: local-storage key `pqc-opening-completed-date-v1` via the core store.

- [ ] **Step 1: Add failing site contract assertions**

Add the opening IDs and local script to the existing contract tests:

```js
for (const id of ['site-opening', 'opening-chip', 'opening-name', 'opening-skip']) {
  assert.match(html, new RegExp(`id=["']${id}["']`), `missing #${id}`);
}
assert.match(html, /src="\.\/opening\.js"/);
assert.match(html, /跳过动画/);
```

Also extend the local-only test input to include `opening.js` and assert it has no `fetch`, `WebSocket`, or `EventSource`.

- [ ] **Step 2: Run the contract test and verify failure**

Run: `node --test tests/site-contract.test.mjs`

Expected: FAIL because the opening markup and script are absent.

- [ ] **Step 3: Add safe, hidden-by-default opening markup**

Insert directly after the skip link:

```html
<section id="site-opening" class="opening" aria-label="PQC.LAB 开场动画" hidden>
  <div class="opening__board" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
  <div id="opening-chip" class="opening__chip" aria-hidden="true"><span>PQC</span></div>
  <div id="opening-name" class="opening__identity">
    <strong>潘泉承</strong>
    <span>PAN QUANCHENG // PQC.LAB</span>
  </div>
  <button id="opening-skip" class="opening__skip" type="button">跳过动画</button>
</section>
```

Load the controller before the existing modules:

```html
<script type="module" src="./opening.js"></script>
<script type="module" src="./app.js"></script>
<script type="module" src="./game.js"></script>
```

The `hidden` attribute is mandatory so a JavaScript failure leaves the portfolio usable.

- [ ] **Step 4: Implement one cleanup path for play and skip**

Create `site/opening.js` with this lifecycle:

```js
import {
  chooseOpeningMode,
  createOpeningStore,
  localDateKey,
} from './opening-core.js';

const overlay = document.querySelector('#site-opening');
const skipButton = document.querySelector('#opening-skip');
let browserStorage;
try {
  browserStorage = window.localStorage;
} catch {
  browserStorage = undefined;
}
const store = createOpeningStore(browserStorage);
const today = localDateKey();
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const mode = chooseOpeningMode({
  completedToday: store.completedToday(today),
  reducedMotion,
});
let completionTimer = 0;
let finished = false;

function finishOpening({ remember = true } = {}) {
  if (finished) return;
  finished = true;
  window.clearTimeout(completionTimer);
  if (remember) store.markComplete(today);
  document.body.classList.remove('opening-active');
  document.body.classList.add('opening-complete');
  overlay.hidden = true;
  window.dispatchEvent(new CustomEvent('pqc:opening-complete'));
}

if (mode === 'skip') {
  finishOpening({ remember: false });
} else {
  overlay.hidden = false;
  document.body.classList.add('opening-active');
  overlay.classList.add(mode === 'reduced' ? 'opening--reduced' : 'opening--full');
  requestAnimationFrame(() => overlay.classList.add('is-playing'));
  completionTimer = window.setTimeout(
    () => finishOpening(),
    mode === 'reduced' ? 500 : 3100,
  );
  skipButton.addEventListener('click', () => finishOpening(), { once: true });
}
```

- [ ] **Step 5: Add the approved animation and reduced-motion CSS**

Implement fixed full-screen layering, circuit traces, a central chip, identity reveal, and dissolve using these stable selectors:

```css
.opening[hidden] { display: none; }
.opening-active { overflow: hidden; }
.opening { position: fixed; z-index: 200; inset: 0; display: grid; place-items: center; background: #04030f; overflow: hidden; }
.opening__board { position: absolute; inset: 0; background-image: linear-gradient(rgba(0,234,255,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0,234,255,.07) 1px, transparent 1px); background-size: 28px 28px; }
.opening__board i { position: absolute; width: 38vw; height: 1px; background: linear-gradient(90deg, transparent, var(--cyan), transparent); opacity: 0; transform: scaleX(0); }
.opening__board i:nth-child(1) { top: 25%; left: -6%; transform-origin: right; }
.opening__board i:nth-child(2) { top: 42%; right: -6%; transform-origin: left; }
.opening__board i:nth-child(3) { bottom: 30%; left: -6%; transform-origin: right; }
.opening__board i:nth-child(4) { right: -6%; bottom: 18%; transform-origin: left; }
.opening.is-playing .opening__board i { animation: opening-signal 1.6s ease .12s both; }
.opening__chip { position: relative; z-index: 1; display: grid; width: min(36vw, 180px); aspect-ratio: 1; border: 1px solid var(--cyan); place-items: center; opacity: 0; transform: scale(.72); }
.opening__chip::before { position: absolute; inset: -12px; content: ""; background: linear-gradient(90deg, transparent 0 9px, rgba(0,234,255,.6) 9px 13px, transparent 13px 24px) top / 24px 8px repeat-x, linear-gradient(90deg, transparent 0 9px, rgba(0,234,255,.6) 9px 13px, transparent 13px 24px) bottom / 24px 8px repeat-x, linear-gradient(0deg, transparent 0 9px, rgba(0,234,255,.6) 9px 13px, transparent 13px 24px) left / 8px 24px repeat-y, linear-gradient(0deg, transparent 0 9px, rgba(0,234,255,.6) 9px 13px, transparent 13px 24px) right / 8px 24px repeat-y; }
.opening__chip span { color: transparent; font-size: clamp(3rem, 9vw, 5.6rem); font-weight: 950; -webkit-text-stroke: 1px var(--cyan); text-shadow: 5px 4px 0 rgba(255,54,165,.65); }
.opening__identity { position: absolute; bottom: 16%; display: grid; gap: 7px; text-align: center; opacity: 0; }
.opening__identity strong { font-size: clamp(1.8rem, 7vw, 4rem); }
.opening__identity span { color: var(--cyan); font: .7rem/1.4 monospace; letter-spacing: .18em; }
.opening__skip { position: absolute; right: 24px; bottom: 24px; color: var(--cyan); background: rgba(4,3,15,.6); }
.opening.is-playing .opening__chip { animation: opening-chip 2.8s ease both; }
.opening.is-playing .opening__identity { animation: opening-name 2.8s .15s ease both; }
.opening.opening--reduced .opening__board { display: none; }
.opening.opening--reduced .opening__chip,
.opening.opening--reduced .opening__identity { animation-duration: .4s; animation-delay: 0s; }
@keyframes opening-chip { 0%, 15% { opacity: 0; transform: scale(.72); } 42%, 80% { opacity: 1; transform: scale(1); box-shadow: 0 0 46px rgba(0,234,255,.22); } 100% { opacity: 0; transform: scale(1.06); } }
@keyframes opening-name { 0%, 42% { opacity: 0; transform: translateY(14px); letter-spacing: .35em; } 62%, 82% { opacity: 1; transform: none; letter-spacing: normal; } 100% { opacity: 0; } }
@keyframes opening-signal { 0% { opacity: 0; transform: scaleX(0); } 28%, 72% { opacity: 1; transform: scaleX(1); box-shadow: 0 0 16px var(--cyan); } 100% { opacity: 0; transform: scaleX(1); } }
```

- [ ] **Step 6: Add browser checks for skip and same-day revisit**

Use the freshly launched browser's empty default context for the first desktop navigation:

```js
await desktop.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
await desktop.locator('#site-opening:not([hidden])').waitFor();
await desktop.locator('#opening-skip').click();
await desktop.locator('#site-opening[hidden]').waitFor();
assert.match(
  await desktop.evaluate(() => localStorage.getItem('pqc-opening-completed-date-v1')),
  /^\d{4}-\d{2}-\d{2}$/,
);
await desktop.reload({ waitUntil: 'networkidle' });
assert.equal(await desktop.locator('#site-opening:not([hidden])').count(), 0);
```

Use two fresh browser contexts for the automatic paths:

```js
const fullContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const fullOpening = await fullContext.newPage();
await fullOpening.goto('http://127.0.0.1:4173', { waitUntil: 'domcontentloaded' });
await fullOpening.locator('#site-opening:not([hidden])').waitFor();
await fullOpening.locator('#site-opening[hidden]').waitFor({ timeout: 4500 });
await fullContext.close();

const reducedContext = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  reducedMotion: 'reduce',
});
const reducedOpening = await reducedContext.newPage();
const reducedStart = Date.now();
await reducedOpening.goto('http://127.0.0.1:4173', { waitUntil: 'domcontentloaded' });
await reducedOpening.locator('#site-opening[hidden]').waitFor({ timeout: 1500 });
assert.ok(Date.now() - reducedStart < 1500);
await reducedContext.close();
```

These contexts have isolated storage, so they exercise first-visit behavior rather than inheriting the desktop skip marker.

- [ ] **Step 7: Run tests and commit**

Run: `npm.cmd test`

Expected: all tests PASS.

Run the existing Edge Playwright command documented in Task 6.

Expected: desktop and mobile smoke checks PASS with no page errors.

```powershell
git add -- site/index.html site/styles.css site/opening.js tests/site-contract.test.mjs tests/browser-smoke.mjs
git commit -m "feat: add chip awakening opening"
```

---

### Task 3: Page Reveal and Visual Cohesion

**Files:**
- Modify: `site/index.html:30-126`
- Modify: `site/styles.css:48-88, 182-430, 470-755, 839-846`
- Modify: `site/app.js:1-43`
- Modify: `tests/site-contract.test.mjs:35-61`
- Modify: `tests/browser-smoke.mjs:34-48`

**Interfaces:**
- Consumes: `pqc:opening-complete` and body class `opening-complete` from Task 2.
- Produces: `.reveal-ready`, `.is-revealed`, and `.motion-paused` states.
- Preserves: `--signal-x` and `--signal-y` pointer-follow variables.

- [ ] **Step 1: Add failing visual-contract assertions**

```js
assert.match(html, /data-reveal/);
assert.match(css, /\.reveal-ready/);
assert.match(css, /\.is-revealed/);
assert.match(app, /motion-paused/);
assert.match(app, /IntersectionObserver/);
```

- [ ] **Step 2: Run the contract test and verify failure**

Run: `node --test tests/site-contract.test.mjs`

Expected: FAIL because reveal hooks and the hidden-page motion state do not exist.

- [ ] **Step 3: Add reveal hooks only to meaningful content groups**

Add `data-reveal` to the hero copy, identity panel, each section heading, project card, skill card, award timeline item, and closing panel. Do not add it to every paragraph or create nested competing animations.

Example:

```html
<div class="hero-copy" data-reveal>...</div>
<div class="identity-panel" data-reveal aria-hidden="true">...</div>
<article class="project-card project-card--featured project-card--chip" data-reveal>...</article>
```

- [ ] **Step 4: Extend `app.js` with safe reveal and visibility behavior**

```js
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const revealTargets = [...document.querySelectorAll('[data-reveal]')];
let revealStarted = false;

function revealEverything() {
  revealTargets.forEach((target) => target.classList.add('is-revealed'));
}

function startReveal() {
  if (revealStarted) return;
  revealStarted = true;
  if (!reducedMotion && 'IntersectionObserver' in window) {
    document.body.classList.add('reveal-ready');
    const revealObserver = new IntersectionObserver((entries, observer) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -8%', threshold: .08 });
    revealTargets.forEach((target) => revealObserver.observe(target));
  } else {
    revealEverything();
  }
}

if (document.body.classList.contains('opening-active')) {
  window.addEventListener('pqc:opening-complete', startReveal, { once: true });
} else startReveal();

document.addEventListener('visibilitychange', () => {
  document.body.classList.toggle('motion-paused', document.hidden);
  if (document.hidden && signalFrame) {
    cancelAnimationFrame(signalFrame);
    signalFrame = 0;
  }
});
```

Guard pointer signal updates with `if (document.hidden || reducedMotion) return;` before queuing a frame. Remove the separate `touchmove` listener because Pointer Events already cover touch and the duplicate path can queue the same visual update twice on mobile.

- [ ] **Step 5: Add restrained reveal and chip polish CSS**

```css
.reveal-ready [data-reveal] { opacity: 0; transform: translateY(24px); }
.reveal-ready [data-reveal].is-revealed { opacity: 1; transform: none; transition: opacity .65s ease, transform .65s ease; }
.opening-complete .hero-copy.is-revealed { transition-delay: .06s; }
.opening-complete .identity-panel.is-revealed { transition-delay: .16s; }
.motion-paused *, .motion-paused *::before, .motion-paused *::after { animation-play-state: paused !important; }
.section-heading { position: relative; padding-bottom: 14px; }
.section-heading::after { position: absolute; right: 0; bottom: 0; left: 0; height: 1px; content: ""; background: linear-gradient(90deg, var(--cyan), rgba(0,234,255,.08) 55%, transparent); }
.project-card::before, .skill-grid article::before, .closing::before { position: absolute; top: -1px; left: -1px; width: 22px; height: 22px; border-top: 1px solid var(--cyan); border-left: 1px solid var(--cyan); content: ""; pointer-events: none; }
.project-card, .skill-grid article, .closing { isolation: isolate; }
.identity-panel { border-color: rgba(0,234,255,.58); box-shadow: inset 0 0 60px rgba(0,234,255,.06), 0 0 56px rgba(0,234,255,.11); }
.project-card--chip::before { opacity: .6; }
.button, button { clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px); }
.award-timeline li:hover::before { transform: scale(1.5); box-shadow: 0 0 18px var(--cyan); }
```

Do not add image files or new colors.

Under `max-width: 760px`, set `.circuit-backdrop::before { opacity: .42; }` and hide `.circuit-backdrop i:nth-child(n+3)`. Under `prefers-reduced-motion: reduce`, force all reveal targets to `opacity: 1`, `transform: none`, and remove their transitions.

- [ ] **Step 6: Add a browser reveal assertion**

```js
await desktop.locator('#projects').scrollIntoViewIfNeeded();
await desktop.locator('#projects [data-reveal]').first().waitFor();
assert.equal(
  await desktop.locator('#projects [data-reveal]').first().evaluate((node) => node.classList.contains('is-revealed')),
  true,
);
```

- [ ] **Step 7: Run tests and commit**

Run: `npm.cmd test`

Expected: all tests PASS.

Run the Edge Playwright smoke command from Task 6.

Expected: reveal assertion, layout, background interaction, and no-error checks PASS.

```powershell
git add -- site/index.html site/styles.css site/app.js tests/site-contract.test.mjs tests/browser-smoke.mjs
git commit -m "feat: polish portfolio motion and chip visuals"
```

---

### Task 4: W/S and Press-and-Hold Mobile Controls

**Files:**
- Modify: `site/game-adapter.js:28-34`
- Modify: `tests/game-adapter.test.mjs:31-44`
- Modify: `site/game-core.js:20-65, 116-138`
- Modify: `tests/game-core.test.mjs:20-55`
- Modify: `site/index.html:84-96`
- Modify: `site/game.js:15-21, 243-320`
- Modify: `site/styles.css:643-656, 818-819`
- Modify: `tests/site-contract.test.mjs:8-13`
- Modify: `tests/browser-smoke.mjs:46-72`

**Interfaces:**
- Produces: `isJumpCommand(event): boolean` accepting KeyW, Space, and ArrowUp on first keydown.
- Produces: `isDuckCommand(event): boolean` accepting KeyS and ArrowDown on first keydown.
- Produces: `isDuckReleaseCommand(event): boolean` accepting KeyS and ArrowDown on keyup.
- Produces: `player.duckRequested: boolean`, preserving a held S/touch request while airborne and applying it on landing.
- Produces: `#game-jump` and held-state `#game-duck[aria-pressed]`.

- [ ] **Step 1: Add W/S adapter tests and held-duck core tests**

```js
import {
  createHighScoreStore,
  formatScore,
  isDuckCommand,
  isDuckReleaseCommand,
  isJumpCommand,
} from '../site/game-adapter.js';

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
```

Add this core regression test:

```js
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
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `node --test tests/game-adapter.test.mjs tests/game-core.test.mjs`

Expected: FAIL for `KeyW`, `KeyS`, the missing `isDuckReleaseCommand` export, and missing `duckRequested` state.

- [ ] **Step 3: Implement the input mapping**

```js
const JUMP_CODES = new Set(['KeyW', 'Space', 'ArrowUp']);
const DUCK_CODES = new Set(['KeyS', 'ArrowDown']);

export function isJumpCommand(event) {
  return !event.repeat && JUMP_CODES.has(event.code);
}

export function isDuckCommand(event) {
  return !event.repeat && DUCK_CODES.has(event.code);
}

export function isDuckReleaseCommand(event) {
  return DUCK_CODES.has(event.code);
}
```

- [ ] **Step 4: Preserve held duck intent in the game core**

Add `duckRequested: false` to the initial player state. Replace `duck` with logic that records a request while running, applies it only on the ground, and always allows a release to clear stuck state:

```js
export function duck(state, active) {
  const duckRequested = Boolean(active);
  if (state.phase !== 'running' && duckRequested) return state;
  if (!duckRequested && !state.player.duckRequested && !state.player.ducking) return state;
  return {
    ...state,
    player: {
      ...state.player,
      duckRequested,
      ducking: duckRequested && state.phase === 'running' && state.player.y === 0,
    },
  };
}
```

In `advanceFrame`, derive landing posture from the held request:

```js
const grounded = y === 0;
const player = {
  ...state.player,
  y,
  ducking: grounded && state.player.duckRequested,
  velocityY: grounded ? 0 : velocityY,
};
```

Keep the existing collision rule that jumping into a flying hazard ends the run.

- [ ] **Step 5: Add explicit mobile action markup and instructions**

Inside `.game-controls`, use:

```html
<button id="game-start" type="button">开始 / 重新开始</button>
<div class="game-actions" aria-label="游戏动作">
  <button id="game-jump" class="button--ghost" type="button">跳跃 <kbd>W</kbd></button>
  <button id="game-duck" class="button--ghost" type="button" aria-pressed="false">蹲下 <kbd>S</kbd></button>
</div>
<button id="game-pause" class="button--ghost" type="button">暂停</button>
<p id="game-status" role="status" aria-live="polite">电脑：W 跳跃，按住 S 蹲下；手机：使用下方两个按钮</p>
```

Update the canvas overlay hint and game HUD to lead with `W + S`.

- [ ] **Step 6: Wire keyboard and pointer lifecycles**

Import `isDuckReleaseCommand`, query `#game-jump`, and use:

```js
function setDuck(active) {
  state = duck(state, active);
  duckButton.setAttribute('aria-pressed', String(state.player.duckRequested));
}

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

function releaseDuck() {
  setDuck(false);
}

duckButton.addEventListener('pointerup', releaseDuck);
duckButton.addEventListener('pointercancel', releaseDuck);
duckButton.addEventListener('lostpointercapture', releaseDuck);
window.addEventListener('blur', releaseDuck);

window.addEventListener('keyup', (event) => {
  if (!isDuckReleaseCommand(event)) return;
  event.preventDefault();
  releaseDuck();
});
```

Keep canvas pointerdown as the optional mobile jump shortcut. Clear duck state on game over and hidden-page pause.

- [ ] **Step 7: Add responsive control styling**

```css
.game-actions { display: grid; grid-template-columns: repeat(2, minmax(110px, 1fr)); gap: 10px; }
.game-actions kbd { margin-left: 7px; color: var(--ink); background: rgba(255,255,255,.82); padding: 2px 5px; }
.game-actions .button--ghost kbd { color: var(--cyan); background: rgba(0,234,255,.1); }
@media (max-width: 760px) {
  .game-actions { order: -1; flex: 1 1 100%; grid-template-columns: 1fr 1fr; }
  .game-actions button { min-height: 58px; font-size: .9rem; touch-action: none; }
}
```

- [ ] **Step 8: Add contract and browser interaction checks**

Add `game-jump` to the required ID list and assert visible copy contains `W` and `S`.

Desktop browser flow:

```js
await desktop.locator('#game').scrollIntoViewIfNeeded();
await desktop.locator('#game-start').click();
await desktop.keyboard.down('s');
assert.equal(await desktop.locator('#game-duck').getAttribute('aria-pressed'), 'true');
await desktop.keyboard.up('s');
assert.equal(await desktop.locator('#game-duck').getAttribute('aria-pressed'), 'false');
await desktop.keyboard.press('w');
```

Mobile browser flow:

```js
await mobile.locator('#game-start').tap();
await mobile.locator('#game-jump').tap();
await mobile.locator('#game-duck').dispatchEvent('pointerdown', { pointerId: 7, pointerType: 'touch' });
assert.equal(await mobile.locator('#game-duck').getAttribute('aria-pressed'), 'true');
await mobile.waitForTimeout(250);
assert.equal(await mobile.locator('#game-duck').getAttribute('aria-pressed'), 'true');
await mobile.locator('#game-duck').dispatchEvent('pointerup', { pointerId: 7, pointerType: 'touch' });
assert.equal(await mobile.locator('#game-duck').getAttribute('aria-pressed'), 'false');
await mobile.locator('#game-duck').dispatchEvent('pointerdown', { pointerId: 8, pointerType: 'touch' });
await mobile.locator('#game-duck').dispatchEvent('pointercancel', { pointerId: 8, pointerType: 'touch' });
assert.equal(await mobile.locator('#game-duck').getAttribute('aria-pressed'), 'false');
```

- [ ] **Step 9: Run tests and commit**

Run: `npm.cmd test`

Expected: all tests PASS.

Run the Edge Playwright smoke command from Task 6.

Expected: W/S and mobile hold/release checks PASS.

```powershell
git add -- site/game-core.js site/game-adapter.js site/index.html site/game.js site/styles.css tests/game-core.test.mjs tests/game-adapter.test.mjs tests/site-contract.test.mjs tests/browser-smoke.mjs
git commit -m "feat: add W S and mobile game controls"
```

---

### Task 5: Runner Frame Smoothness and Offscreen Efficiency

**Files:**
- Modify: `site/game-adapter.js:1-34`
- Modify: `tests/game-adapter.test.mjs:45-50`
- Modify: `site/game.js:21-80, 266-322`
- Modify: `site/styles.css:615-641, 810-818`
- Modify: `tests/browser-smoke.mjs:45-75`

**Interfaces:**
- Produces: `normalizeFrameDelta(deltaMs: number, maxMs?: number): number`, default cap 100 ms.
- Produces: `canvasInView: boolean` maintained by IntersectionObserver in `game.js`.
- Produces: one scheduled animation frame only while the game is running and visible.
- Preserves: deterministic `stepGame` behavior and all existing collision rules.

- [ ] **Step 1: Add a failing frame-delta test**

```js
test('frame delta rejects invalid values and caps long stalls', () => {
  assert.equal(normalizeFrameDelta(16), 16);
  assert.equal(normalizeFrameDelta(5000), 100);
  assert.equal(normalizeFrameDelta(-4), 0);
  assert.equal(normalizeFrameDelta(Number.NaN), 0);
  assert.equal(normalizeFrameDelta(80, 50), 50);
});
```

Add `normalizeFrameDelta` to the adapter test import.

- [ ] **Step 2: Run the adapter test and verify failure**

Run: `node --test tests/game-adapter.test.mjs`

Expected: FAIL because `normalizeFrameDelta` is not exported.

- [ ] **Step 3: Implement frame normalization without changing game rules**

```js
export function normalizeFrameDelta(deltaMs, maxMs = 100) {
  const value = Number(deltaMs);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(value, Math.max(1, Number(maxMs) || 100));
}
```

Import it in `game.js` and call `stepGame(state, normalizeFrameDelta(delta))`. Leave `game-core.js` unchanged so deterministic long-duration unit simulations and collision behavior remain intact.

- [ ] **Step 4: Render continuously only while the game is running and visible**

```js
let animationFrame = 0;
let canvasInView = true;

function scheduleFrame() {
  if (animationFrame || state.phase !== 'running' || !canvasInView || document.hidden) return;
  animationFrame = requestAnimationFrame(frame);
}

if ('IntersectionObserver' in window) {
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    canvasInView = entry.isIntersecting;
    lastTime = performance.now();
    if (canvasInView) scheduleFrame();
    else {
      releaseDuck();
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
  }, { rootMargin: '120px 0px' });
  visibilityObserver.observe(canvas);
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
```

Call `scheduleFrame()` from `start()`, from the “continue” branch of `pause()`, and when the observer brings a running game back into view. Replace the unconditional bottom-level `requestAnimationFrame(frame)` with the existing single initial `render(state, highScore)`. On `visibilitychange`, clear held duck before pausing. This prevents a stuck crouch when the browser cancels a touch or key event.

- [ ] **Step 5: Cache static drawing values and reduce mobile glow cost**

Create the moon radial gradient once after obtaining the 2D context, instead of recreating it in every frame. Define `compactRendering` with `matchMedia('(max-width: 760px)')`; use a wider grid step and lower shadow blur on compact screens while preserving silhouettes, coordinates, and hit boxes.

Required code shape:

```js
const compactRendering = window.matchMedia('(max-width: 760px)').matches;
const moonGradient = context.createRadialGradient(780, 70, 8, 780, 70, 76);
moonGradient.addColorStop(0, 'rgba(255,54,165,.34)');
moonGradient.addColorStop(.52, 'rgba(111,31,130,.15)');
moonGradient.addColorStop(.55, 'rgba(255,54,165,.26)');
moonGradient.addColorStop(.58, 'rgba(255,54,165,0)');
```

Use `compactRendering ? 64 : 48` for grid spacing and `compactRendering ? 7 : 14` for runner/obstacle glow.

Remove the mobile `min-height: 220px` rule from `#runner-canvas`; keep its natural `8 / 3` aspect ratio so the canvas is not stretched and blurred on a 390px screen. Add `touch-action: manipulation` only where a single tap is expected and `touch-action: none` to the held duck button.

- [ ] **Step 6: Add a sustained browser frame check**

After starting the game, sample 60 animation frames:

```js
const frameP95 = await desktop.evaluate(() => new Promise((resolve) => {
  const deltas = [];
  let previous = 0;
  function sample(time) {
    if (previous) deltas.push(time - previous);
    previous = time;
    if (deltas.length < 60) requestAnimationFrame(sample);
    else {
      deltas.sort((a, b) => a - b);
      resolve(deltas[Math.floor(deltas.length * .95)]);
    }
  }
  requestAnimationFrame(sample);
}));
assert.ok(frameP95 < 120, `animation frame p95 was ${frameP95}ms`);
```

The threshold detects major stalls without requiring a specific refresh rate.

- [ ] **Step 7: Run focused, full, and browser tests**

Run: `node --test tests/game-core.test.mjs tests/game-adapter.test.mjs`

Expected: all game tests PASS, including jumping into a flying hazard ending the run.

Run: `npm.cmd test`

Expected: all tests PASS.

Run the Edge Playwright smoke command from Task 6.

Expected: desktop, mobile, controls, and sustained-frame checks PASS with no page errors.

- [ ] **Step 8: Commit the smoothness work**

```powershell
git add -- site/game-adapter.js site/game.js site/styles.css tests/game-adapter.test.mjs tests/browser-smoke.mjs
git commit -m "perf: smooth runner frame handling"
```

---

### Task 6: Documentation, Full Verification, Release, and H-Drive Package

**Files:**
- Modify: `README.md`
- Delete after replacement: `outputs/pqc-lab-portfolio.zip`
- Create outside repository: `H:\YINGSI\简历\pqc-lab-portfolio.zip`

**Interfaces:**
- Consumes: completed static `site/` directory and all test scripts.
- Produces: deployed GitHub Pages site and one verified H-drive ZIP.

- [ ] **Step 1: Update public usage documentation**

Document:

```markdown
- 首次访问会播放约 3 秒的“芯片唤醒”动画，可跳过；当天再次访问会直接进入主页。
- 电脑：W 跳跃，按住 S 蹲下；空格、方向键仍可使用。
- 手机：点击“跳跃”，按住“蹲下”并在需要起身时松开。
- 地面障碍必须跳跃，飞线和激光必须蹲下。
```

Keep the privacy section unchanged except for wording needed to match the current public site.

- [ ] **Step 2: Run the complete automated suite**

Run: `npm.cmd test`

Expected: every Node test PASS.

Run:

```powershell
$env:PLAYWRIGHT_MODULE_URL='file:///C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'
$env:PLAYWRIGHT_CHROMIUM_PATH='C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
npm.cmd run test:browser
```

Expected: opening, desktop, mobile, controls, frame timing, canvas rendering, reveal, overflow, and no-error checks PASS.

- [ ] **Step 3: Verify privacy and local-only behavior**

Run:

```powershell
rg -n "GPA|15187908848|2846355673@qq\.com|光电信息与计算机工程学院|所在|地址" site README.md
rg -n "fetch\s*\(|WebSocket|EventSource|https?://" site
```

Expected: first command finds none of the private values; second command finds only the approved Edgi-Talk GitHub link and no runtime network APIs.

- [ ] **Step 4: Inspect desktop and mobile screenshots**

Use Playwright with Edge to capture `output/playwright/opening-polish-desktop.png` at 1440×1000 and `output/playwright/opening-polish-mobile.png` at 390×844 after skipping the opening. Inspect both images for clipped text, overlapping controls, unreadable contrast, and unintended horizontal scrolling.

Expected: the opening and homepage are visually coherent; mobile action buttons are large and fully visible.

- [ ] **Step 5: Commit documentation and any final test-only adjustment**

```powershell
git add -- README.md tests site
git diff --check
git commit -m "docs: update portfolio controls and opening"
```

If there is nothing new to commit after earlier task commits, skip the commit and record the clean status.

- [ ] **Step 6: Create the ZIP directly on H: and remove the C: copy**

Resolve and verify both exact paths before removal or overwrite:

```powershell
$repoRoot = (Resolve-Path '.').Path
$oldZip = [System.IO.Path]::GetFullPath((Join-Path $repoRoot 'outputs\pqc-lab-portfolio.zip'))
$destinationDir = (Resolve-Path 'H:\YINGSI\简历').Path
$destinationZip = Join-Path $destinationDir 'pqc-lab-portfolio.zip'
if (-not $oldZip.StartsWith($repoRoot, [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Unexpected C: ZIP path' }
if (Test-Path -LiteralPath $oldZip) { Remove-Item -LiteralPath $oldZip }
Compress-Archive -Path 'site\*' -DestinationPath $destinationZip -Force
Get-Item -LiteralPath $destinationZip | Select-Object FullName,Length,LastWriteTime
Get-ChildItem -LiteralPath (Join-Path $repoRoot 'outputs') -Filter '*.zip'
```

Expected: the H: ZIP exists and has nonzero length; no ZIP remains in the C: `outputs` directory.

- [ ] **Step 7: Validate the archive contents**

Open the H: ZIP as an archive and verify it contains `index.html`, `styles.css`, `opening-core.js`, `opening.js`, `app.js`, `game-core.js`, `game-adapter.js`, `game.js`, and `favicon.svg` at the archive root. Extract only to a temporary directory created with `New-Item` or the system temp facility, run the local browser smoke check against it, then remove only that verified temporary directory.

- [ ] **Step 8: Finish the branch and publish**

Use `superpowers:finishing-a-development-branch` after all tests pass. Merge the approved branch to `master`, then:

```powershell
git push origin master
gh run list --branch master --limit 3
$pagesRun = gh run list --branch master --workflow pages.yml --limit 1 --json databaseId | ConvertFrom-Json
gh run watch $pagesRun[0].databaseId --exit-status
```

Expected: the GitHub Pages workflow completes successfully.

- [ ] **Step 9: Verify the public website**

Open `https://p32qc3.github.io/pqc-lab/` in Playwright and verify:

- HTTP status 200.
- First visit shows `#site-opening`; skip works.
- Same-day reload does not replay the full opening.
- The page contains `潘泉承`, `上海理工大学`, `东部赛区二等奖`, and the Edgi-Talk link.
- The page does not contain any excluded private value.
- W/S and mobile buttons work.
- No horizontal overflow, console errors, or page errors occur.

- [ ] **Step 10: Final clean-state check**

Run: `git status --short --branch`

Expected: clean `master`, synchronized with `origin/master`, with no ZIP under C: and the verified ZIP under `H:\YINGSI\简历`.
