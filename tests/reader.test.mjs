import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readState, stateURL, columnsFor, matches } from '../public/script/editions.mjs';
const index = JSON.parse(await readFile(new URL('../public/data/index.json', import.meta.url)));
const parse = query => readState(new URL('http://localhost/umineko/script/' + query), index);
test('default and invalid inputs select a safe paired edition without prototype lookups', () => {
  for (const edition of ['','unknown','__proto__','constructor']) {
    const s = parse('?edition=' + edition + '&compare=invalid');
    assert.equal(s.script, 'pc'); assert.equal(s.compare, 'none'); assert.equal(s.chapter, 'umi1_op');
  }
});
test('edition constraints exclude incompatible comparison texts and error flags', () => {
  assert.deepEqual(columnsFor(parse('?edition=pc&compare=both')).map(c=>c.key), ['pc-ja','mao-pc']);
  assert.deepEqual(columnsFor(parse('?edition=ps3&compare=both')).map(c=>c.key), ['ps3-ja','mao-ps3','umineko-project','mangagamer']);
  assert.deepEqual(parse('?edition=ps3&compare=mangagamer&errors=witch-hunt,mangagamer').errors,['mangagamer']);
});
test('all eight episode links resolve, while older preview URLs still work', () => {
  for(let ep=1;ep<=8;ep++) assert.equal(parse('?section='+ep).section,ep);
  assert.equal(parse('?script=ps3&compare=both').script,'ps3');
  assert.equal(parse('?edition=pc&chapter=umi2_op').chapter,'umi2_op');
});
test('reload/back state round trips script, edition, query, scope, comparisons and errors', () => {
  const s=parse('?edition=ps3&script=umi3_op&scope=corpus&q=日本語&compare=both&errors=mangagamer&filter=3');
  const url=stateURL('http://localhost/umineko/script/',s,'umi3_op-L0001');
  assert.deepEqual(readState(url,index),s);
  assert.equal(url.pathname,'/umineko/script/'); assert.equal(decodeURIComponent(url.hash.slice(1)),'umi3_op-L0001');
});
test('search includes both speaker languages, long phrases and width variants', () => {
  const row={enText:'A phrase longer than five characters.',jaText:'日本語の台詞',speaker:'Terumasa Nanjou',speakerJa:'南條　輝正'};
  for(const q of ['longer than five','ＮＡＮＪＯＵ','南條輝正','日本語']) assert.equal(matches(row,q),true,q);
  assert.equal(matches(row,'absent words'),false);
});
test('comparison files keep source names and never import audit findings', async () => {
  const read = async key => JSON.parse(await readFile(new URL('../public/data/comparisons/'+key+'/umi1_op.json',import.meta.url)));
  for(const key of ['umineko-project','mangagamer']) {
    const row=(await read(key)).rows['umi1_op-L0001'];
    assert.equal(row.speaker,'Nanjo Terumasa'); assert.ok(row.text); assert.equal(row.findings,undefined);
  }
  const wh=(await read('witch-hunt')).rows['umi1_op-L0001'];
  assert.equal(wh.speaker,''); assert.match(wh.text,/overcome your love of alcohol/);
});
test('audit finding deep links survive reader URL round trips',()=>{
 const state=parse('?edition=ps3&script=umi1_op&compare=mangagamer&errors=mangagamer&finding=WH-EP01-TEST-001');
 assert.equal(state.finding,'WH-EP01-TEST-001');
 assert.equal(readState(stateURL('http://localhost/umineko/script/',state,'umi1_op-L0001'),index).finding,state.finding);
});
