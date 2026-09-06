import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname } from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_URL);
let server;
let baseURL = process.env.SITE_URL;
if (!baseURL) {
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
  server = createServer(async (request, response) => {
    const name = new URL(request.url, 'http://localhost').pathname.slice(1) || 'index.html';
    if (!/^[a-z0-9.-]+$/i.test(name)) return response.writeHead(404).end();
    try {
      const content = await readFile(new URL(`../site/${name}`, import.meta.url));
      response.writeHead(200, { 'content-type': types[extname(name)] || 'application/octet-stream' }).end(content);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseURL = `http://127.0.0.1:${server.address().port}`;
}
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH });
const results = [];
const errors = [];
async function check(name, action) {
  console.log(`Checking: ${name}`);
  try { await action(); results.push({ name, passed: true }); }
  catch (error) { results.push({ name, passed: false, error: error.message }); }
}
async function open(options = {}, init) {
  const page = await browser.newPage(options);
  page.on('pageerror', (error) => errors.push(error.message));
  if (init) await page.addInitScript(init);
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  return page;
}
async function skip(page) {
  if (await page.locator('#opening-skip').isVisible()) await page.locator('#opening-skip').click();
  await page.locator('#site-opening[hidden]').waitFor({ state: 'attached' });
}

try {
  await check('opening keeps keyboard focus on the visible skip control and Escape dismisses it', async () => {
    const page = await open({ viewport: { width: 1280, height: 800 } });
    assert.equal(await page.evaluate(() => document.activeElement.id), 'opening-skip');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'opening-skip');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#site-opening').isHidden(), true);
    assert.equal(await page.locator('main').evaluate((node) => node.inert), false);
    assert.equal(await page.evaluate(() => document.activeElement.classList.contains('brand')), true);
    await page.close();
  });

  for (const width of [1440, 1024, 768, 390, 320]) {
    await check(`navigation, text and section access at ${width}px`, async () => {
      const page = await open({ viewport: { width, height: 900 }, isMobile: width < 500, hasTouch: width < 500 });
      await skip(page);
      assert.equal(await page.locator('.site-header').evaluate((node) => getComputedStyle(node).position), 'sticky');
      assert.equal(await page.locator('.skip-link').evaluate((node) => getComputedStyle(node).position), 'fixed');
      const targets = await page.locator('.site-header nav a').evaluateAll((nodes) => nodes.map((node) => ({ w: node.getBoundingClientRect().width, h: node.getBoundingClientRect().height })));
      assert.ok(targets.every(({ w, h }) => w >= 44 && h >= 44), 'navigation needs finger-sized targets');
      const email = await page.locator('.public-profile dd').last().evaluate((node) => ({ height: node.getBoundingClientRect().height, line: parseFloat(getComputedStyle(node).lineHeight) }));
      assert.ok(email.height <= email.line + 1, 'email should not be broken across lines');
      for (const id of ['projects', 'game', 'skills', 'awards']) {
        await page.locator(`.site-header nav a[href="#${id}"]`).click();
        await page.waitForFunction((id) => {
          const heading = document.querySelector(`#${id} .section-heading`);
          const top = heading.getBoundingClientRect().top;
          const headerBottom = document.querySelector('.site-header').getBoundingClientRect().bottom;
          return top >= headerBottom && top < innerHeight / 2 && getComputedStyle(heading).opacity === '1';
        }, id, { timeout: 3000 });
        assert.ok(Math.abs((await page.locator('.site-header').boundingBox()).y) <= 1, 'navigation scrolled away');
      }
      // Scroll naturally through every block before taking full-page evidence.
      await page.evaluate(() => document.documentElement.style.scrollBehavior = 'auto');
      for (let y = 0; y < await page.evaluate(() => document.body.scrollHeight); y += 550) {
        await page.evaluate((y) => window.scrollTo(0, y), y);
        await page.waitForTimeout(90);
      }
      await page.locator('.closing').scrollIntoViewIfNeeded();
      assert.equal(await page.locator('.closing a[href^="mailto:"]').count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'horizontal overflow');
      await page.locator('.closing a[href="#top"]').click();
      await page.waitForTimeout(700);
      assert.ok(await page.evaluate(() => scrollY < 100), 'return to top failed');
      assert.equal(await page.locator('.site-header nav a[aria-current]').count(), 0, 'the header must not highlight an offscreen section after returning home');
      if (width === 1440 || width === 390) {
        await mkdir('output/playwright', { recursive: true });
        await page.screenshot({ path: `output/playwright/optimized-${width}-hero.png` });
        await page.screenshot({ path: `output/playwright/optimized-${width}-all.png`, fullPage: true });
      }
      await page.close();
    });
  }

  await check('content stays readable when scroll animation observation is delayed', async () => {
    const page = await open({}, () => {
      window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
    });
    await skip(page);
    const hidden = await page.locator('[data-reveal]').evaluateAll((nodes) => nodes.filter((node) => getComputedStyle(node).opacity === '0').length);
    assert.equal(hidden, 0);
    await page.close();
  });

  await check('background animation is paused when the page initially opens hidden', async () => {
    const page = await open({}, () => Object.defineProperty(document, 'hidden', { configurable: true, value: true }));
    assert.equal(await page.locator('body').evaluate((node) => node.classList.contains('motion-paused')), true);
    await page.close();
  });

  await check('content and contacts work without JavaScript', async () => {
    const page = await open({ javaScriptEnabled: false });
    assert.equal(await page.locator('#site-opening').isHidden(), true);
    assert.equal(await page.locator('#projects h3').first().isVisible(), true);
    assert.equal(await page.locator('.closing a[href^="mailto:"]').count(), 1);
    await page.close();
  });
  await check('no browser errors', async () => assert.deepEqual(errors, []));
} finally {
  await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  console.log(JSON.stringify(results, null, 2));
}
if (results.some((result) => !result.passed)) process.exitCode = 1;
