import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {annotateRows} from '../public/script/audit.mjs';
import {findingRefs} from '../public/script/anchors.mjs';
import {readerLink} from '../public/audit/audit.mjs';
import {reviewedRefs,review} from '../scripts/reviewed-audit-anchors.mjs';
const read = p => JSON.parse(fs.readFileSync(new URL('../public/data/' + p + '.json', import.meta.url)));
const normalize = value => String(value || '').normalize('NFKC').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/\s+/g,' ').trim();

test('identical MG and UP passages never receive asymmetric displayed findings across the PS3 corpus',()=>{
 const conflicts=[]; let compared=0;
 for(const chapter of read('index').scripts){
  const rows=read('ps3/'+chapter.id).rows, mg=read('comparisons/mangagamer/'+chapter.id).rows, up=read('comparisons/umineko-project/'+chapter.id).rows;
  for(const row of rows)row.comparisons={mangagamer:mg[row.ref]&&{...mg[row.ref]},'umineko-project':up[row.ref]&&{...up[row.ref]}};
  annotateRows(rows,read('audit/chapters/'+chapter.id),chapter.id,['mangagamer','umineko-project']);
  for(const row of rows){
   const m=row.comparisons.mangagamer,u=row.comparisons['umineko-project'];
   if(!m?.text||normalize(m.text)!==normalize(u?.text))continue;
   compared++;
   const ids=value=>(value.findings||[]).filter(f=>f.kind!=='PC').map(f=>f.id).sort();
   if(JSON.stringify(ids(m))!==JSON.stringify(ids(u)))conflicts.push({ref:row.ref,MG:ids(m),UP:ids(u)});
  }
 }
 assert.ok(compared>1000); assert.deepEqual(conflicts,[]);
});
test('exported finding anchors reproduce verified receipts or exact source matches',()=>{
 const data=read('audit/index'), chapters=new Map();
 for(const f of data.findings)for(const [contextIndex,c] of f.contexts.entries()){
  if(!c.chapter)continue;
  if(!chapters.has(c.chapter))chapters.set(c.chapter,read('ps3/'+c.chapter).rows);
  assert.ok(c.findingRefs,f.id+' has explicit finding anchors');
  for(const edition of ['WH','MG','UP']){
   const reviewed=reviewedRefs(f,c,contextIndex,edition,chapters.get(c.chapter));
   assert.deepEqual(c.findingRefs[edition],reviewed??findingRefs(f,{...c,findingRefs:undefined},edition,chapters.get(c.chapter)),f.id+' '+edition);
   for(const ref of c.findingRefs[edition])if(!c.readerRefs[edition].includes(ref)){
    assert.equal(f.id,'WH-EP02-CH08-004');assert.equal(ref,'umi2_8-L0057');
   }
  }
 }
});
test('all 574 previously unlocalized edition contexts have explicit review receipts',()=>{
 assert.equal(review.cases,496);assert.equal(review.entries.length,574);
 assert.equal(review.entries.filter(e=>e.status==='anchored').length,571);
 const held=review.entries.filter(e=>e.status==='withheld');
 assert.deepEqual(held.map(e=>[e.id,e.edition]),[['PAIR-EP02-CH14-361-480-001','UP'],['PAIR-EP03-CH09-481-600-004','MG']]);
 assert.ok(held.every(e=>e.refs.length===0&&e.note.length>40));
});
test('paired semantic anchors exclude nearby context and preserve edition-specific targets',()=>{
 const data=read('audit/index');
 const refs=(id,edition)=>data.findings.find(f=>f.id===id).contexts.flatMap(c=>c.findingRefs[edition]);
 assert.deepEqual(refs('PAIR-EP01-GEORGE-ADULT-001','MG'),['umi1_2-L0598']);
 assert.deepEqual(refs('PAIR-EP01-DINNER-SERVICE-001','MG'),['umi1_7-L0505','umi1_7-L0513']);
 assert.deepEqual(refs('PAIR-EP01-DINNER-SERVICE-001','UP'),['umi1_7-L0513']);
 assert.ok(refs('WH-EP02-CH08-004','MG').includes('umi2_8-L0057'));
 assert.ok(!refs('WH-EP02-CH08-004','MG').includes('umi2_8-L0058'));
});
test('reviewed anchors reject changed Japanese or audit judgments',()=>{
 const data=read('audit/index'),r=review.entries.find(e=>e.status==='anchored');
 const f=data.findings.find(f=>f.id===r.id),c=f.contexts[r.contextIndex],rows=read('ps3/'+c.chapter).rows;
 assert.throws(()=>reviewedRefs({...f,description:f.description+' changed'},c,r.contextIndex,r.edition,rows),/Stale anchor review/);
 const altered=rows.map(row=>row.ref===r.refs[0]?{...row,jaText:row.jaText+'変更'}:row);
 assert.throws(()=>reviewedRefs(f,c,r.contextIndex,r.edition,altered),/Changed anchor source/);
});
test('context-only audit links do not request an unrelated inline error',()=>{
 const c={chapter:'umi1_5',readerRefs:{MG:['umi1_5-L0339']},findingRefs:{MG:[]}};
 const link=new URL(readerLink('mangagamer',c,'EXAMPLE'),'https://example.test/audit/');
 assert.equal(link.hash,'#umi1_5-L0339'); assert.equal(link.searchParams.has('finding'),false);
 const exact={...c,findingRefs:{MG:['umi1_5-L0341']}};
 const target=new URL(readerLink('mangagamer',exact,'EXAMPLE'),'https://example.test/audit/');
 assert.equal(target.hash,'#umi1_5-L0341'); assert.equal(target.searchParams.get('finding'),'EXAMPLE');
});
