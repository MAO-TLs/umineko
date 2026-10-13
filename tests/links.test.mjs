import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../public/', import.meta.url));
async function htmlFiles(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory() && entry.name !== 'data') result.push(...await htmlFiles(file));
    else if (entry.isFile() && entry.name.endsWith('.html')) result.push(file);
  }
  return result;
}

test('every static local page link and asset resolves under the /umineko/ mount', async () => {
  const failures = [];
  const pages = await htmlFiles(root);
  assert.ok(pages.length >= 6);
  for (const page of pages) {
    const html = await readFile(page, 'utf8');
    const base = 'http://local/umineko/' + path.relative(root, page);
    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const reference = match[1].replaceAll('&amp;', '&');
      if (/^(https?:|mailto:|data:|#)/.test(reference)) continue;
      const url = new URL(reference, base);
      assert.ok(url.pathname.startsWith('/umineko/'), reference + ' escapes the site mount');
      const target = path.join(root, decodeURIComponent(url.pathname.slice('/umineko/'.length)));
      try {
        const info = await stat(target);
        if (info.isDirectory()) await stat(path.join(target, 'index.html'));
      } catch {
        failures.push(path.relative(root, page) + ': ' + reference);
      }
    }
  }
  assert.deepEqual(failures, []);
});

test('every exported audit reader anchor exists in its own Japanese edition', async () => {
  const audit = JSON.parse(await readFile(path.join(root, 'data/audit/index.json'), 'utf8'));
  const chapters = new Map();
  let checked = 0;
  for (const finding of audit.findings) for (const context of finding.contexts || []) {
    for (const [edition, refs] of Object.entries(context.readerRefs || {})) {
      assert.ok(['WH', 'MG', 'UP'].includes(edition));
      const file = (edition === 'WH' ? 'pc' : 'ps3') + '/' + context.chapter + '.json';
      if (!chapters.has(file)) {
        const chapter = JSON.parse(await readFile(path.join(root, 'data', file), 'utf8'));
        chapters.set(file, new Set(chapter.rows.map(row => row.ref)));
      }
      for (const ref of refs) {
        assert.ok(chapters.get(file).has(ref), finding.id + ' / ' + edition + ': ' + ref);
        checked++;
      }
    }
  }
  assert.ok(checked > 0, 'Audit export must contain reader anchors');
});
