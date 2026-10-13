import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import {annotateRows,annotateGroups,applies} from '../public/script/audit.mjs';
import {applyPhraseExclusions} from '../public/audit/phrase-links.mjs';
import {readerLink} from '../public/audit/audit.mjs';
import {groupPassages} from '../public/script/groups.mjs';
import {auditRange} from '../public/script/passage.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../public/data/'+p+'.json',import.meta.url)));
const normalize=s=>String(s||'').normalize('NFKC').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/\s+/g,' ').trim();
test('whole-corpus phrase receipts are complete, current, and compiled into every chapter',()=>{
  const result=spawnSync(process.execPath,['scripts/compile-phrase-review.mjs','--check'],{cwd:new URL('../',import.meta.url),encoding:'utf8'});
  assert.equal(result.status,0,result.stdout+'\n'+result.stderr);
});
test('every applicable audit occurrence has an explicit reviewed phrase or exception plan',()=>{
  const data=read('audit/index'),cache=new Map(),editions={WH:'witch-hunt',MG:'mangagamer',UP:'umineko-project'};
  for(const f of data.findings.filter(f=>f.kind!=='PC'))for(const c of f.contexts)for(const edition of f.editions) {
    if(!applies(f,c,editions[edition]))continue;
    if(!cache.has(c.chapter))cache.set(c.chapter,read('audit/chapters/'+c.chapter));
    for(const ref of c.findingRefs[edition]||[]) {
      const plan=cache.get(c.chapter).phrases?.[f.id]?.[ref]?.[edition];
      assert.ok(plan,f.id+'/'+edition+'/'+ref);
      assert.ok(Array.isArray(plan)?plan.length>0:['omission','anchor-mismatch'].includes(plan.kind));
    }
  }
});
test('reviewed omissions remain notes and corrected neighboring passages are not marked',()=>{
  const rows=['a','b','c'].map(ref=>({ref,jaText:'source',comparisons:{mangagamer:{text:'Correct words then wrong words.'}}}));
  const audit={findings:[{id:'X',editions:['MG'],contexts:[{chapter:'ch',dispositions:{MG:'retained'},findingRefs:{MG:['a','b','c']}}]}],phrases:{X:{a:{MG:['wrong words']},b:{MG:{kind:'omission',reason:'missing clause'}},c:{MG:{kind:'anchor-mismatch',reason:'corrected neighboring clause'}}}}};
  annotateRows(rows,audit,'ch',['mangagamer']);
  assert.deepEqual(rows[0].comparisons.mangagamer.findings[0].highlights,['wrong words']);
  assert.equal(rows[1].comparisons.mangagamer.findings[0].omission,true);
  assert.deepEqual(rows[1].comparisons.mangagamer.findings[0].highlights,[]);
  assert.equal(rows[2].comparisons.mangagamer.findings,undefined);
});
test('combined WH paragraphs retain phrase selections from every member',()=>{
  const rows=[{members:[{comparisons:{'witch-hunt':{findings:[{id:'X',highlights:['first']}]}}},{comparisons:{'witch-hunt':{findings:[{id:'X',highlights:['second']}]}}}]}];
  annotateGroups(rows);
  assert.deepEqual(rows[0].comparisonGroup.findings[0].highlights,['first','second']);
});
test('audit links skip a corrected context row and target the surviving defect',()=>{
  const data={findings:[{id:'X',contexts:[{chapter:'ch',findingRefs:{MG:['correct','wrong']},readerRefs:{MG:['correct','wrong']}}]}],phraseExclusions:[{id:'X',contextIndex:0,edition:'MG',ref:'correct'}]};
  applyPhraseExclusions(data);
  const link=new URL(readerLink('mangagamer',data.findings[0].contexts[0],'X'),'https://example.test/audit/');
  assert.equal(link.hash,'#wrong');
  assert.equal(link.searchParams.get('finding'),'X');
});
test('relocated audit cards quote the same Japanese and English passage their links open',()=>{
  const data=read('audit/index'),projected=applyPhraseExclusions(structuredClone(data)),editions={WH:'witch-hunt',MG:'mangagamer',UP:'umineko-project'};
  assert.ok(data.phraseEvidence.length>5);
  for(const e of data.phraseEvidence) {
    const c=projected.findings.find(f=>f.id===e.id).contexts[e.contextIndex];
    assert.equal(c.findingRefs[e.edition][0],e.ref);
    assert.equal(c.findingEvidence[e.edition].translation,read('comparisons/'+editions[e.edition]+'/'+c.chapter).rows[e.ref].text);
    if(e.edition!=='WH')assert.equal(c.findingEvidence[e.edition].japanese,read('ps3/'+c.chapter).rows.find(r=>r.ref===e.ref).jaText);
  }
});
test('identical MG and UP text has identical phrase scopes for the same finding throughout the corpus',()=>{
  const conflicts=[];
  for(const chapter of read('index').scripts) {
    const rows=read('ps3/'+chapter.id).rows;
    for(const key of ['mangagamer','umineko-project']) {
      const comparison=read('comparisons/'+key+'/'+chapter.id).rows;
      for(const row of rows){row.comparisons ||= {};row.comparisons[key]=comparison[row.ref]&&{...comparison[row.ref]};}
    }
    annotateRows(rows,read('audit/chapters/'+chapter.id),chapter.id,['mangagamer','umineko-project']);
    for(const row of rows) {
      const mg=row.comparisons.mangagamer,up=row.comparisons['umineko-project'];
      if(!mg?.text||normalize(mg.text)!==normalize(up?.text))continue;
      for(const m of mg.findings||[]) {
        if(m.kind==='PC')continue;
        const u=up.findings?.find(f=>f.id===m.id);if(!u)continue;
        const scopes=f=>[...new Set(f.highlights.map(normalize))].sort();
        if(JSON.stringify(scopes(m))!==JSON.stringify(scopes(u))||!!m.omission!==!!u.omission)conflicts.push({ref:row.ref,id:m.id,MG:scopes(m),UP:scopes(u)});
      }
    }
  }
  assert.deepEqual(conflicts,[]);
});
test('every WH phrase survives the reader combined-passage layout across all eight episodes',()=>{
  let checked=0,groups=0;
  for(const s of read('index').scripts) {
    const comp=read('comparisons/witch-hunt/'+s.id);
    const rows=read('pc/'+s.id).rows.map(r=>({...r,comparisons:{'witch-hunt':comp.rows[r.ref]&&{...comp.rows[r.ref]}}}));
    annotateRows(rows,read('audit/chapters/'+s.id),s.id,['witch-hunt']);
    for(const row of annotateGroups(groupPassages(rows,comp.groups))) {
      if(row.members)groups++;
      const comparison=row.members?row.comparisonGroup:row.comparisons?.['witch-hunt'];
      for(const finding of comparison?.findings||[])for(const phrase of finding.highlights||[]) {
        checked++;assert.ok(auditRange(comparison.text,phrase),finding.id+'/'+row.ref+': '+phrase);
      }
    }
  }
  assert.ok(checked>4000);assert.ok(groups>1000);
});
