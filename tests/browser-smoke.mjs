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

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
});

try {
  await waitForServer();
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  desktop.on('pageerror', (error) => errors.push(error.message));
  desktop.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
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

  await desktop.locator('#game-start').click();
  await desktop.keyboard.press('Space');
  await desktop.keyboard.press('ArrowDown');
  await desktop.waitForTimeout(180);
  await desktop.keyboard.up('ArrowDown');
  assert.match(await desktop.locator('#game-status').innerText(), /游戏进行中/);
  assert.equal(await desktop.evaluate(() => {
    const canvas = document.querySelector('#runner-canvas');
    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    return pixels.some((value, index) => index % 4 === 3 && value > 0);
  }), true, 'canvas should render opaque pixels');
  assert.equal(await desktop.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
  assert.deepEqual(errors, []);
  console.log('desktop: pass');

  const fullContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const fullOpening = await fullContext.newPage();
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
  await mobile.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
  await mobile.locator('#runner-canvas').tap();
  await mobile.locator('#game-duck').tap();
  await mobile.waitForTimeout(180);
  assert.match(await mobile.locator('#game-status').innerText(), /游戏进行中/);
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
  console.log('mobile: pass');
  console.log('game controls: pass');
} finally {
  await browser.close();
  server.kill();
}
