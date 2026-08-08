# Runner Profile Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add approved profile information, a GitHub project link, stronger chip visuals, an interactive static background, and a richer runner game with jump and duck controls.

**Architecture:** Keep the static site structure. `index.html` owns content, `styles.css` owns visual treatment, `game-core.js` owns game state and collision rules, `game-adapter.js` owns input helpers, and `game.js` owns canvas rendering and DOM events.

**Tech Stack:** Static HTML/CSS, browser canvas, JavaScript ES modules, Node test runner, Playwright smoke test.

## Global Constraints

- Show only approved personal details: name, undergraduate school, and `panquancheng2006@163.com`.
- Do not publish GPA, phone number, address, QQ email, or detailed college/department.
- Keep the site public and deployable through GitHub Pages.
- Preserve cyberpunk style and add chip/circuit motifs without making the page visually cluttered.
- Background interaction must be local-only and lightweight.

---

### Task 1: Public Content Contract

**Files:**
- Modify: `tests/site-contract.test.mjs`
- Modify: `site/index.html`
- Modify: `site/styles.css`

**Interfaces:**
- Consumes: static HTML content.
- Produces: visible approved identity block and first-project GitHub link.

- [ ] **Step 1: Write the failing test**

Add assertions that the HTML contains `潘泉承`, `上海理工大学`, `panquancheng2006@163.com`, and `https://github.com/p32qc3/Edgi-Talk`; and does not contain GPA, phone number, QQ email, address, or detailed college/department.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- tests/site-contract.test.mjs`

- [ ] **Step 3: Write minimal implementation**

Replace garbled page text with normal Chinese, add the approved identity block, add the GitHub link to the first project, and add chip/circuit CSS motifs.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- tests/site-contract.test.mjs`

### Task 2: Runner Game Controls and Obstacles

**Files:**
- Modify: `tests/game-core.test.mjs`
- Modify: `tests/game-adapter.test.mjs`
- Modify: `site/game-core.js`
- Modify: `site/game-adapter.js`
- Modify: `site/game.js`
- Modify: `site/index.html`

**Interfaces:**
- Consumes: `createGame`, `startGame`, `jump`, `stepGame`, and keyboard events.
- Produces: `duck(state, isDucking)`, `isDuckCommand(event)`, obstacle `type`, and canvas rendering for varied obstacles.

- [ ] **Step 1: Write the failing tests**

Add tests for duck shrinking the collision body, ArrowDown as a duck command, and generated obstacles including ground and airborne types.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm.cmd test -- tests/game-core.test.mjs tests/game-adapter.test.mjs`

- [ ] **Step 3: Write minimal implementation**

Add duck state, duck input helpers, obstacle types, type-aware collision rectangles, a duck button, and distinct canvas drawings for chip, e-waste, wire, and laser obstacles.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm.cmd test -- tests/game-core.test.mjs tests/game-adapter.test.mjs`

### Task 3: Interactive Static Background

**Files:**
- Modify: `tests/site-contract.test.mjs`
- Modify: `site/index.html`
- Modify: `site/styles.css`
- Modify: `site/app.js`

**Interfaces:**
- Consumes: pointer and touch movement in the browser.
- Produces: CSS variables `--signal-x` and `--signal-y` on `document.documentElement`.

- [ ] **Step 1: Write the failing test**

Assert that the page includes `circuit-backdrop`, `app.js` updates `--signal-x`, and no source uses `fetch`, `WebSocket`, or `EventSource`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- tests/site-contract.test.mjs`

- [ ] **Step 3: Write minimal implementation**

Add a decorative circuit backdrop and update CSS variables through a requestAnimationFrame-throttled pointer handler.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- tests/site-contract.test.mjs`

### Task 4: Verification and Deployment

**Files:**
- Modify: `tests/browser-smoke.mjs`
- Update: `outputs/pqc-lab-portfolio.zip`

**Interfaces:**
- Consumes: completed site files.
- Produces: validated local site, updated ZIP, pushed branch, and public GitHub Pages deployment.

- [ ] **Step 1: Update browser smoke expectations**

Check that the game starts, ArrowDown works without page errors, the canvas is nonblank, and mobile/desktop have no horizontal overflow.

- [ ] **Step 2: Run full tests**

Run: `npm.cmd test`.

- [ ] **Step 3: Run browser smoke**

Run: `npm.cmd run test:browser` with the configured Playwright environment.

- [ ] **Step 4: Package and publish**

Update the ZIP, commit the changes, push to `master`, wait for GitHub Pages, then verify the public URL.
