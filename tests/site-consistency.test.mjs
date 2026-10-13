import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

test('reader uses the shared script-version label', () => {
  assert.ok(read("public/script/index.html").includes("Script version v1.0.0"));
});

test('GitHub navigation opens this title repository', () => {
  for (const file of ["public/index.html","public/script/index.html","public/audit/index.html"]) {
    const text = read(file);
    assert.ok(text.includes('href="https://github.com/MAO-TLs/umineko">GitHub</a>'), file);
    assert.ok(!text.includes('href="https://github.com/MAO-TLs">GitHub</a>'), file);
  }
});

test('release metadata links to the existing installation section', () => {
  const home = read("public/index.html");
  assert.ok(home.includes('href="#install">Installation instructions</a>'));
  assert.ok(home.includes('id="install"'));
  assert.ok(home.includes('Patch version'));
});

