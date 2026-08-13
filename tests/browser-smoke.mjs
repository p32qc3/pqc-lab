import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const playwrightModuleUrl = process.env.PLAYWRIGHT_MODULE_URL;
if (!playwrightModuleUrl) throw new Error('PLAYWRIGHT_MODULE_URL is required');

const { chromium } = await import(playwrightModuleUrl);
const server = spawn(process.env.PYTHON_COMMAND || 'python', [
  '-m', 'http.server', '4173', '--bind', '127.0.0.1', '--directory', 'site',
], { cwd: new URL('..', import.meta.url), stdio: 'ignore' });

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch('http://127.0.0.1:4173');
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('local site did not start');
}

async function trackRunnerRenders(page) {
  await page.addInitScript(() => {
    window.__runnerClearCount = 0;
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function getContext(...args) {
      const context = originalGetContext.apply(this, args);
      if (this.id !== 'runner-canvas' || args[0] !== '2d' || context.__runnerClearInstrumented) return context;
      const originalClearRect = context.clearRect.bind(context);
      context.clearRect = (...clearArgs) => {
        window.__runnerClearCount += 1;
        return originalClearRect(...clearArgs);
      };
      context.__runnerClearInstrumented = true;
      return context;
    };
  });
}

function trackPageErrors(page, errors) {
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
}

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
});

try {
  await waitForServer();
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await trackRunnerRenders(desktop);
  const errors = [];
  trackPageErrors(desktop, errors);
  await desktop.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });

  await desktop.locator('#site-opening:not([hidden])').waitFor();
  await desktop.locator('#opening-skip').click();
  await desktop.locator('#site-opening[hidden]').waitFor({ state: 'attached' });
  assert.match(
    await desktop.evaluate(() => localStorage.getItem('pqc-opening-completed-date-v1')),
    /^\d{4}-\d{2}-\d{2}$/,
  );
  await desktop.reload({ waitUntil: 'networkidle' });
  assert.equal(await desktop.locator('#site-opening:not([hidden])').count(), 0);

  const idleStart = await desktop.evaluate(() => window.__runnerClearCount);
  await desktop.waitForTimeout(1000);
  const idleDraws = await desktop.evaluate((start) => window.__runnerClearCount - start, idleStart);

  for (const id of ['projects', 'game', 'skills', 'awards']) {
    assert.equal(await desktop.locator(`#${id}`).count(), 1, `missing #${id}`);
  }

  await desktop.locator('#projects').scrollIntoViewIfNeeded();
  await desktop.locator('#projects [data-reveal].is-revealed').first().waitFor();
  assert.equal(
    await desktop.locator('#projects [data-reveal]').first().evaluate((node) => node.classList.contains('is-revealed')),
    true,
  );

  await desktop.mouse.move(1200, 120);
  await desktop.waitForTimeout(80);
  assert.notEqual(
    await desktop.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--signal-x').trim()),
    '50%',
  );

  await desktop.locator('#game').scrollIntoViewIfNeeded();
  await desktop.locator('#game-start').click();
  const runningStart = await desktop.evaluate(() => window.__runnerClearCount);
  await desktop.waitForTimeout(250);
  const runningDraws = await desktop.evaluate((start) => window.__runnerClearCount - start, runningStart);
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
  await desktop.keyboard.down('s');
  assert.equal(await desktop.locator('#game-duck').getAttribute('aria-pressed'), 'true');
  await desktop.keyboard.up('s');
  assert.equal(await desktop.locator('#game-duck').getAttribute('aria-pressed'), 'false');
  await desktop.locator('#game-pause').click();
  const pausedStart = await desktop.evaluate(() => window.__runnerClearCount);
  await desktop.waitForTimeout(350);
  const pausedDraws = await desktop.evaluate((start) => window.__runnerClearCount - start, pausedStart);
  await desktop.locator('#game-pause').click();
  await desktop.locator('#game-status').filter({ hasText: '游戏结束' }).waitFor({ timeout: 8000 });
  const overStart = await desktop.evaluate(() => window.__runnerClearCount);
  await desktop.waitForTimeout(350);
  const overDraws = await desktop.evaluate((start) => window.__runnerClearCount - start, overStart);
  await desktop.locator('#game-start').click();
  await desktop.keyboard.press('w');
  assert.match(await desktop.locator('#game-status').innerText(), /游戏进行中/);
  assert.equal(await desktop.evaluate(() => {
    const canvas = document.querySelector('#runner-canvas');
    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    return pixels.some((value, index) => index % 4 === 3 && value > 0);
  }), true, 'canvas should render opaque pixels');
  assert.equal(await desktop.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
  console.log(`runner frames: idle=${idleDraws}/s running=${runningDraws}/250ms paused=${pausedDraws}/350ms over=${overDraws}/350ms p95=${frameP95.toFixed(2)}ms`);
  assert.ok(idleDraws <= 1, `idle canvas rendered ${idleDraws} times in one second`);
  assert.ok(runningDraws >= 4, `running canvas rendered only ${runningDraws} times in 250ms`);
  assert.ok(pausedDraws <= 1, `paused canvas rendered ${pausedDraws} times in 350ms`);
  assert.ok(overDraws <= 1, `finished canvas rendered ${overDraws} times in 350ms`);
  assert.ok(frameP95 < 120, `animation frame p95 was ${frameP95}ms`);
  assert.deepEqual(errors, []);
  console.log('desktop: pass');

  const fullContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const fullOpening = await fullContext.newPage();
  trackPageErrors(fullOpening, errors);
  const fullStart = Date.now();
  await fullOpening.goto('http://127.0.0.1:4173', { waitUntil: 'domcontentloaded' });
  await fullOpening.locator('#site-opening:not([hidden])').waitFor();
  await fullOpening.locator('#site-opening[hidden]').waitFor({ state: 'attached', timeout: 4500 });
  const fullDuration = Date.now() - fullStart;
  assert.ok(fullDuration >= 2800 && fullDuration < 4500, `full opening should take about 3 seconds, got ${fullDuration}ms`);
  await fullContext.close();

  const reducedContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'reduce',
  });
  const reducedOpening = await reducedContext.newPage();
  trackPageErrors(reducedOpening, errors);
  const reducedStart = Date.now();
  await reducedOpening.goto('http://127.0.0.1:4173', { waitUntil: 'domcontentloaded' });
  await reducedOpening.locator('#site-opening:not([hidden])').waitFor();
  await reducedOpening.waitForFunction(() => {
    const selectors = ['#opening-chip', '#opening-name'];
    return selectors.every((selector) => {
      const element = document.querySelector(selector);
      return element
        && getComputedStyle(element).opacity === '1'
        && element.getClientRects().length > 0;
    });
  }, undefined, { timeout: 250 });
  await reducedOpening.locator('#site-opening[hidden]').waitFor({ state: 'attached', timeout: 1500 });
  assert.ok(Date.now() - reducedStart < 1500);
  await reducedContext.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  trackPageErrors(mobile, errors);
  await mobile.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
  const mobileCanvas = await mobile.locator('#runner-canvas').evaluate((canvas) => {
    const rect = canvas.getBoundingClientRect();
    return { width: rect.width, height: rect.height, ratio: rect.width / rect.height };
  });
  assert.ok(Math.abs(mobileCanvas.ratio - (8 / 3)) < .05, `mobile canvas ratio was ${mobileCanvas.ratio}`);
  assert.equal(await mobile.locator('#game-jump').evaluate((button) => getComputedStyle(button).touchAction), 'manipulation');
  assert.equal(await mobile.locator('#game-duck').evaluate((button) => getComputedStyle(button).touchAction), 'none');
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
  await mobile.locator('#game-duck').dispatchEvent('pointerdown', { pointerId: 9, pointerType: 'touch' });
  await mobile.locator('#game-duck').dispatchEvent('lostpointercapture', { pointerId: 9, pointerType: 'touch' });
  assert.equal(await mobile.locator('#game-duck').getAttribute('aria-pressed'), 'false');
  assert.match(await mobile.locator('#game-status').innerText(), /游戏进行中/);
  await mobile.locator('#game-duck').dispatchEvent('pointerdown', { pointerId: 10, pointerType: 'touch' });
  await mobile.evaluate(() => window.dispatchEvent(new Event('blur')));
  assert.equal(await mobile.locator('#game-duck').getAttribute('aria-pressed'), 'false');
  await mobile.locator('#game-duck').dispatchEvent('pointerdown', { pointerId: 11, pointerType: 'touch' });
  await mobile.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  assert.equal(await mobile.locator('#game-duck').getAttribute('aria-pressed'), 'false');
  assert.equal(await mobile.locator('#game-pause').innerText(), '继续');
  assert.match(await mobile.locator('#game-status').innerText(), /游戏已暂停/);
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
  assert.deepEqual(errors, []);
  console.log(`mobile canvas: ${mobileCanvas.width}x${mobileCanvas.height} ratio=${mobileCanvas.ratio.toFixed(3)}`);
  console.log('mobile: pass');
  console.log('game controls: pass');
} finally {
  await browser.close();
  server.kill();
}
