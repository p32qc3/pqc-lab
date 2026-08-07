import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const indexUrl = new URL('../site/index.html', import.meta.url);

test('publishes every approved section and game control', async () => {
  const html = await readFile(indexUrl, 'utf8');
  for (const id of ['projects', 'game', 'skills', 'awards', 'runner-canvas', 'game-start', 'game-pause']) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `missing #${id}`);
  }
});

test('keeps common private fields and external resources out of the public page', async () => {
  const html = await readFile(indexUrl, 'utf8');
  assert.doesNotMatch(html, /GPA|学校|学院|电话|邮箱|所在地|1[3-9]\d{9}|mailto:|https?:\/\//i);
  assert.match(html, /PQC\.LAB/);
});

test('loads only local styles and modules', async () => {
  const html = await readFile(indexUrl, 'utf8');
  assert.match(html, /href="\.\/styles\.css"/);
  assert.match(html, /src="\.\/app\.js"/);
  assert.match(html, /src="\.\/game\.js"/);
});
