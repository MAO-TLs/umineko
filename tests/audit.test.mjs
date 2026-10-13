import test from 'node:test';
import assert from 'node:assert/strict';
import { auditKey, readerLink } from '../public/audit/audit.mjs';
import { COMPARISONS } from '../public/script/editions.mjs';

test('audit selector accepts only known translations, including inherited object names', () => {
  for (const key of Object.keys(COMPARISONS)) {
    assert.equal(auditKey(new URL('http://localhost/audit/?script=' + key)), key);
    assert.equal(COMPARISONS[key].audit, '../audit/?script=' + key);
    const link = new URL(readerLink(key), 'http://localhost/audit/');
    assert.equal(link.searchParams.get('compare'), key);
    assert.equal(link.searchParams.get('edition'), key === 'witch-hunt' ? 'pc' : 'ps3');
  }
  for (const value of ['', 'unknown', 'constructor', 'toString']) {
    assert.equal(auditKey(new URL('http://localhost/audit/?script=' + value)), 'witch-hunt');
  }
});
