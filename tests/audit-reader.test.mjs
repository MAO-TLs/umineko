import test from 'node:test';
import assert from 'node:assert/strict';
import { annotateRows, annotateGroups } from '../public/script/audit.mjs';
const context={chapter:'umi1_op',readerRefs:{WH:['a'],MG:['a'],UP:['a']},WH:'WH prose',MG:'MG prose',UP:'UP prose',japanesePC:'PC原文',japanesePS3:'PS3原文',dispositions:{MG:'retained',UP:'corrected'}};
const finding={id:'WH-001',kind:'WH',editions:['WH','MG','UP'],description:'Canonical description',categories:['accuracy.meaning'],contexts:[context]};
const rows=()=>[{ref:'a',comparisons:{'witch-hunt':{text:'WH prose'},mangagamer:{text:'MG prose'},'umineko-project':{text:'UP prose'}}}];
test('each occurrence keeps independent outcomes and source edition evidence',()=>{
 const result=annotateRows(rows(),{findings:[finding]},'umi1_op',['witch-hunt','mangagamer','umineko-project']);
 assert.equal(result[0].comparisons.mangagamer.findings.length,1);
 assert.equal(result[0].comparisons['umineko-project'].findings,undefined);
 assert.equal(result[0].comparisons['witch-hunt'].findings[0].japanese,'PC原文');
 assert.equal(result[0].comparisons.mangagamer.findings[0].japanese,'PS3原文');
 assert.equal(result[0].comparisons.mangagamer.text,'MG prose');
});
test('WH never borrows a PS3 row mapping when its exact source mapping is absent',()=>{
 const f={...finding,contexts:[{...context,readerRef:'a',readerRefs:{WH:[],MG:['a'],UP:['a']}}]};
 assert.equal(annotateRows(rows(),{findings:[f]},'umi1_op',['witch-hunt'])[0].comparisons['witch-hunt'].findings,undefined);
});
test('combined WH cells collect findings from all members once',()=>{
 const members=annotateRows(rows(),{findings:[finding]},'umi1_op',['witch-hunt']);
 const combined=annotateGroups([{members:[...members,...members],comparisonGroup:{text:'WH prose'}}]);
 assert.deepEqual(combined[0].comparisonGroup.findings.map(f=>f.id),['WH-001']);
});
