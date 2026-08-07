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

  for (const id of ['projects', 'game', 'skills', 'awards']) {
    assert.equal(await desktop.locator(`#${id}`).count(), 1, `missing #${id}`);
  }
  await desktop.locator('#game-start').click();
  await desktop.keyboard.press('Space');
  await desktop.waitForTimeout(180);
  assert.match(await desktop.locator('#game-status').innerText(), /游戏进行中/);
  assert.equal(await desktop.evaluate(() => {
    const canvas = document.querySelector('#runner-canvas');
    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    return pixels.some((value, index) => index % 4 === 3 && value > 0);
  }), true, 'canvas should render opaque pixels');
  assert.equal(await desktop.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
  assert.deepEqual(errors, []);
  console.log('desktop: pass');

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await mobile.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
  await mobile.locator('#runner-canvas').tap();
  await mobile.waitForTimeout(180);
  assert.match(await mobile.locator('#game-status').innerText(), /游戏进行中/);
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
  console.log('mobile: pass');
  console.log('game controls: pass');
} finally {
  await browser.close();
  server.kill();
}
