import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const indexUrl = new URL('../site/index.html', import.meta.url);

test('publishes every approved section and game control', async () => {
  const html = await readFile(indexUrl, 'utf8');
  for (const id of ['projects', 'game', 'skills', 'awards', 'runner-canvas', 'game-start', 'game-jump', 'game-pause', 'game-duck']) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `missing #${id}`);
  }
  assert.match(html, /电脑：W 跳跃，按住 S 蹲下/);
});

test('publishes the chip awakening opening controls', async () => {
  const html = await readFile(indexUrl, 'utf8');
  for (const id of ['site-opening', 'opening-chip', 'opening-name', 'opening-skip']) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `missing #${id}`);
  }
  assert.match(html, /src="\.\/opening\.js"/);
  assert.match(html, /跳过动画/);
});

test('publishes approved identity and project link only', async () => {
  const html = await readFile(indexUrl, 'utf8');
  assert.match(html, /潘泉承/);
  assert.match(html, /上海理工大学/);
  assert.match(html, /panquancheng2006@163\.com/);
  assert.match(html, /mailto:panquancheng2006@163\.com/);
  assert.match(html, /https:\/\/github\.com\/p32qc3\/Edgi-Talk/);
  assert.match(html, /东部赛区二等奖/);
  assert.doesNotMatch(html, /东部赛区三等奖/);
  assert.doesNotMatch(html, /GPA|光电信息与计算机工程学院|15187908848|2846355673@qq\.com|所在|地址/i);
  assert.match(html, /PQC\.LAB/);
});

test('loads only local styles and modules', async () => {
  const html = await readFile(indexUrl, 'utf8');
  assert.match(html, /href="\.\/styles\.css"/);
  assert.match(html, /src="\.\/opening\.js"/);
  assert.match(html, /src="\.\/app\.js"/);
  assert.match(html, /src="\.\/game\.js"/);
});

test('defines the approved neon palette and responsive safeguards', async () => {
  const css = await readFile(new URL('../site/styles.css', import.meta.url), 'utf8');
  assert.match(css, /--cyan:\s*#00eaff/i);
  assert.match(css, /--magenta:\s*#ff36a5/i);
  assert.match(css, /@media\s*\(max-width:\s*760px\)/i);
  assert.match(css, /prefers-reduced-motion:\s*reduce/i);
  assert.match(css, /\.opening\.opening--reduced\s+\.opening__chip,[\s\S]*?animation:\s*none\s*!important;[\s\S]*?opacity:\s*1;/);
});

test('provides safe page reveal and hidden-page motion states', async () => {
  const html = await readFile(indexUrl, 'utf8');
  const css = await readFile(new URL('../site/styles.css', import.meta.url), 'utf8');
  const app = await readFile(new URL('../site/app.js', import.meta.url), 'utf8');

  assert.match(html, /data-reveal/);
  assert.match(css, /\.reveal-ready/);
  assert.match(css, /\.is-revealed/);
  assert.match(app, /motion-paused/);
  assert.match(app, /IntersectionObserver/);
});

test('provides keyboard navigation landmarks', async () => {
  const html = await readFile(indexUrl, 'utf8');
  assert.match(html, /class="skip-link"/);
  assert.match(html, /aria-label="主要导航"/);
});

test('keeps background interaction static and local only', async () => {
  const html = await readFile(indexUrl, 'utf8');
  const app = await readFile(new URL('../site/app.js', import.meta.url), 'utf8');
  const game = await readFile(new URL('../site/game.js', import.meta.url), 'utf8');
  const opening = await readFile(new URL('../site/opening.js', import.meta.url), 'utf8');

  assert.match(html, /class="circuit-backdrop"/);
  assert.match(app, /--signal-x/);
  assert.doesNotMatch(`${html}\n${app}\n${game}\n${opening}`, /\bfetch\s*\(|WebSocket|EventSource/i);
});
