import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url));
const pngSize = bytes => {
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
};
test('Umineko favicon is a solid white vector emblem on the shared rounded dark-gold square', async () => {
  const svg = (await read('public/favicon.svg')).toString();
  assert.match(svg, /viewBox="0 0 64 64"/);
  assert.match(svg, /<rect width="64" height="64" rx="14" fill="#ad7f15"/);
  assert.match(svg, /<path[^>]+fill="#ffffff"/);
  assert.doesNotMatch(svg, /stroke=|<(?:script|image|text|foreignObject)\b|(?:href|onload)=/i);
});
test('all private pages share the SVG, PNG, ICO, and touch icon', async () => {
  for (const [page, prefix] of [['index.html', './'], ['audit/index.html', '../'], ['audit-witch-hunt/index.html', '../'], ['audit-umineko-project/index.html', '../'], ['audit-mangagamer/index.html', '../'], ['script/index.html', '../']]) {
    const html = (await read('public/' + page)).toString();
    for (const icon of ['favicon.svg', 'favicon.png', 'favicon.ico', 'apple-touch-icon.png']) {
      assert.ok(html.includes(`href="${prefix}${icon}"`));
      const url = new URL(prefix + icon, 'http://127.0.0.1:4339/' + page);
      assert.equal(url.pathname, '/' + icon);
    }
  }
});
test('PNG fallback and touch icon dimensions are correct', async () => {
  assert.deepEqual(pngSize(await read('public/favicon.png')), [32, 32]);
  assert.deepEqual(pngSize(await read('public/apple-touch-icon.png')), [180, 180]);
});
test('ICO contains valid native 16, 32, and 48 pixel PNG frames', async () => {
  const ico = await read('public/favicon.ico');
  assert.equal(ico.readUInt16LE(0), 0);
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 3);
  for (const [i, size] of [16, 32, 48].entries()) {
    const entry = 6 + i * 16;
    assert.equal(ico[entry], size);
    assert.equal(ico[entry + 1], size);
    const length = ico.readUInt32LE(entry + 8), offset = ico.readUInt32LE(entry + 12);
    assert.ok(offset >= 54 && offset + length <= ico.length);
    assert.deepEqual(pngSize(ico.subarray(offset, offset + length)), [size, size]);
  }
});
