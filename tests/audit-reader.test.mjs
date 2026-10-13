import test from 'node:test';
import assert from 'node:assert/strict';
import { annotateRows, annotateGroups } from '../public/script/audit.mjs';
import { readFileSync } from 'node:fs';
import { findingRefs } from '../public/script/anchors.mjs';
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
const read = name => JSON.parse(readFileSync(new URL('../public/data/' + name + '.json', import.meta.url)));
test('reported gold and Nanjo findings attach to the relevant source passage, never surrounding dialogue',()=>{
 const audit=read('audit/chapters/umi1_5'), source=read('ps3/umi1_5').rows;
 const comparisons={mangagamer:read('comparisons/mangagamer/umi1_5').rows,'umineko-project':read('comparisons/umineko-project/umi1_5').rows};
 const rows=source.map(r=>({...r,comparisons:Object.fromEntries(Object.entries(comparisons).map(([k,v])=>[k,{...v[r.ref]}]))}));
 const gold=audit.findings.find(f=>f.id==='WH-EP01-CH05-007'), nanjo=audit.findings.find(f=>f.id==='WH-EP01-CH05-022');
 for (const [f,expected] of [[gold,'umi1_5-L0341'],[nanjo,'umi1_5-L0932']]) {
  assert.deepEqual(findingRefs(f,{...f.contexts[0],findingRefs:undefined},'MG',rows),[expected]);
 }
 annotateRows(rows,{findings:[gold,nanjo]},'umi1_5',['mangagamer','umineko-project']);
 for(const ref of ['umi1_5-L0344','umi1_5-L0931']) for(const key of Object.keys(comparisons))assert.equal(rows.find(r=>r.ref===ref).comparisons[key].findings,undefined);
 const krauss=rows.find(r=>r.ref==='umi1_5-L0344');
 assert.equal(krauss.comparisons.mangagamer.text.trim(),krauss.comparisons['umineko-project'].text.trim());
 for(const ref of ['umi1_5-L0341','umi1_5-L0932']) {
  assert.equal(rows.find(r=>r.ref===ref).comparisons.mangagamer.findings.length,1);
  assert.equal(rows.find(r=>r.ref===ref).comparisons['umineko-project'].findings,undefined);
 }
});
test('a broad context without a precise source anchor cannot mark every row as an error',()=>{
 const c={...context,readerRefs:{MG:['a','b']},japanesePC:''};
 assert.deepEqual(findingRefs(finding,c,'MG',[{ref:'a',jaText:'前の発言'},{ref:'b',jaText:'次の発言'}]),[]);
});
