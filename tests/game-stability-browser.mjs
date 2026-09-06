import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import test, { after, before } from 'node:test';

const playwrightModuleUrl = process.env.PLAYWRIGHT_MODULE_URL;
if (!playwrightModuleUrl) throw new Error('PLAYWRIGHT_MODULE_URL is required');
const { chromium } = await import(playwrightModuleUrl);
const siteRoot = fileURLToPath(new URL('../site/', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
let browser;
let server;
let baseUrl;

before(async () => {
  server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const path = resolve(siteRoot, `.${pathname === '/' ? '/index.html' : pathname}`);
      if (!path.startsWith(siteRoot.endsWith(sep) ? siteRoot : `${siteRoot}${sep}`)) {
        response.writeHead(403).end();
        return;
      }
      const content = await readFile(path);
      response.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream' });
      response.end(content);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
});

after(async () => {
  await browser?.close();
  if (server) await new Promise((resolve) => server.close(resolve));
});

async function openGame(t, { blockedStorage = false } = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  t.after(() => page.close());
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  if (blockedStorage) {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() { throw new DOMException('Storage disabled', 'SecurityError'); },
      });
    });
  }
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  if (await page.locator('#site-opening:not([hidden])').count()) await page.locator('#opening-skip').click();
  await page.locator('#game').scrollIntoViewIfNeeded();
  return { page, errors };
}

async function startGame(page) {
  await page.locator('#game-start').click();
  await page.locator('#game-start').evaluate((button) => button.blur());
  assert.match(await page.locator('#game-status').innerText(), /游戏进行中/);
}

async function assertDuck(page, expected) {
  assert.equal(await page.locator('#game-duck').getAttribute('aria-pressed'), String(expected));
  await page.waitForFunction((ducking) => {
    const context = document.querySelector('#runner-canvas').getContext('2d');
    const [, green] = context.getImageData(150, 260, 1, 1).data;
    return ducking ? green !== 234 : green === 234;
  }, expected, { timeout: 1000 });
}

test('blocked localStorage getter does not prevent the game starting or finishing', async (t) => {
  const { page, errors } = await openGame(t, { blockedStorage: true });
  await startGame(page);
  await page.locator('#game-status').filter({ hasText: '游戏结束' }).waitFor({ timeout: 8000 });
  await startGame(page);
  assert.deepEqual(errors, []);
});

test('restart clears the duck indicator and held input from the previous run', async (t) => {
  const { page } = await openGame(t);
  await startGame(page);
  await page.keyboard.down('s');
  await assertDuck(page, true);
  await startGame(page);
  await assertDuck(page, false);
  await page.keyboard.down('ArrowDown');
  await page.keyboard.up('ArrowDown');
  await assertDuck(page, false);
  await page.keyboard.up('s');
});

test('releasing either duck key preserves the other held duck key', async (t) => {
  const { page } = await openGame(t);
  for (const [first, second] of [['s', 'ArrowDown'], ['ArrowDown', 's']]) {
    await startGame(page);
    await page.keyboard.down(first);
    await page.keyboard.down(second);
    await page.keyboard.up(first);
    await assertDuck(page, true);
    await page.keyboard.up(second);
    await assertDuck(page, false);
  }
});

test('releasing a pointer preserves a held keyboard duck request', async (t) => {
  const { page } = await openGame(t);
  await startGame(page);
  await page.keyboard.down('s');
  await page.locator('#game-duck').dispatchEvent('pointerdown', { pointerId: 7, pointerType: 'touch' });
  await page.locator('#game-duck').dispatchEvent('pointerup', { pointerId: 7, pointerType: 'touch' });
  await assertDuck(page, true);
  await page.keyboard.up('s');
  await assertDuck(page, false);
});

test('releasing a keyboard key preserves a held pointer duck request', async (t) => {
  const { page } = await openGame(t);
  await startGame(page);
  await page.locator('#game-duck').dispatchEvent('pointerdown', { pointerId: 7, pointerType: 'touch' });
  await page.keyboard.down('s');
  await page.keyboard.up('s');
  await assertDuck(page, true);
  await page.locator('#game-duck').dispatchEvent('pointerup', { pointerId: 7, pointerType: 'touch' });
  await assertDuck(page, false);
});

test('cancelling one touch preserves another active touch', async (t) => {
  const { page } = await openGame(t);
  await startGame(page);
  const duck = page.locator('#game-duck');
  await duck.dispatchEvent('pointerdown', { pointerId: 7, pointerType: 'touch' });
  await duck.dispatchEvent('pointerdown', { pointerId: 8, pointerType: 'touch' });
  await duck.dispatchEvent('pointercancel', { pointerId: 7, pointerType: 'touch' });
  await duck.dispatchEvent('lostpointercapture', { pointerId: 7, pointerType: 'touch' });
  await assertDuck(page, true);
  await duck.dispatchEvent('pointerup', { pointerId: 8, pointerType: 'touch' });
  await assertDuck(page, false);
});

test('idle game does not capture page scrolling keys', async (t) => {
  const { page } = await openGame(t);
  const prevented = await page.evaluate(() => ['Space', 'ArrowUp', 'ArrowDown'].map((code) => {
    const event = new KeyboardEvent('keydown', { code, bubbles: true, cancelable: true });
    document.body.dispatchEvent(event);
    return event.defaultPrevented;
  }));
  assert.deepEqual(prevented, [false, false, false]);
  assert.doesNotMatch(await page.locator('#game-status').innerText(), /游戏进行中/);
});

test('space on the pause button uses its native activation', async (t) => {
  const { page } = await openGame(t);
  await startGame(page);
  await page.locator('#game-pause').focus();
  await page.keyboard.press('Space');
  assert.match(await page.locator('#game-status').innerText(), /游戏已暂停/);
});

test('jump and duck buttons support keyboard-only activation', async (t) => {
  const { page } = await openGame(t);
  await page.locator('#game-jump').focus();
  await page.keyboard.press('Enter');
  assert.match(await page.locator('#game-status').innerText(), /游戏进行中/);
  await startGame(page);
  await page.locator('#game-duck').focus();
  await page.keyboard.down('Space');
  await assertDuck(page, true);
  await page.keyboard.up('Space');
  await assertDuck(page, false);
});

test('typing and composing do not issue game commands', async (t) => {
  const { page } = await openGame(t);
  await startGame(page);
  const prevented = await page.evaluate(() => {
    const input = document.createElement('input');
    document.querySelector('#game').append(input);
    const editor = document.createElement('div');
    editor.contentEditable = 'true';
    document.querySelector('#game').append(editor);
    return [input, editor, document.body].flatMap((target) => ['KeyW', 'KeyS'].map((code) => {
      const event = new KeyboardEvent('keydown', {
        code, bubbles: true, cancelable: true, isComposing: target === document.body,
      });
      target.dispatchEvent(event);
      return event.defaultPrevented;
    }));
  });
  assert.deepEqual(prevented, [false, false, false, false, false, false]);
  await assertDuck(page, false);
});
