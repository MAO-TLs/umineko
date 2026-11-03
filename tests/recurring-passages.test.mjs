import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const row=(edition,ref)=>JSON.parse(readFileSync(new URL(`../public/data/${edition}/${ref.split('-L')[0]}.json`,import.meta.url))).rows.find(r=>r.ref===ref);
for(const edition of ['pc','ps3'])test(`${edition}: repeated letter and formal rule retain wording and styles`,()=>{
 for(const [a,b] of [['umi3_2-L0671','umi1_7-L0824'],['umi3_2-L0674','umi1_7-L0827'],['umi7_19-L3212','umi7_1-L0261']]){
  const target=row(edition,a),match=row(edition,b);
  assert.equal(target.enText,match.enText);assert.deepEqual(target.en,match.en);
 }
 assert.deepEqual(row(edition,'umi7_19-L3212').en[1][1],['red']);
});
