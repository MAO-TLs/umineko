import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {groupFindings,filterFindings} from '../public/audit/audit.mjs';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const data=JSON.parse(await read('public/data/audit/index.json'));
test('all three audits use four broad categories and nested subcategories without losing findings',()=>{
 for(const [script,total] of [['witch-hunt',3969],['mangagamer',3495],['umineko-project',2177]]){
  const findings=filterFindings(data.findings,{script,view:'findings'});
  assert.equal(findings.length,total);
  const groups=groupFindings(findings,data.categories);
  assert.deepEqual(groups.map(g=>g.id),['linguistic','mystery','character','world']);
  assert.deepEqual(new Set(groups.flatMap(g=>g.subcategories.flatMap(c=>c.findings.map(f=>f.id)))),new Set(findings.map(f=>f.id)));
  for(const g of groups){
   assert.ok(g.subcategories.length>0);
   assert.equal(g.count,new Set(g.subcategories.flatMap(c=>c.findings.map(f=>f.id))).size);
   for(const c of g.subcategories){assert.equal(c.family,g.id);assert.ok(c.findings.every(f=>f.categories.includes(c.id)));}
  }
 }
});
test('yellow PC notes never become a fifth defect category',()=>{
 assert.ok(groupFindings(data.findings.filter(f=>f.kind==='PC'),data.categories).every(g=>g.count===0&&g.subcategories.length===0));
});
test('filtered and empty results retain the same four-category hierarchy',()=>{
 for(const q of ['WH-EP05-CH14-024','no-match-uniquely-absent']){
  const findings=filterFindings(data.findings,{script:'witch-hunt',view:'findings',q});
  const groups=groupFindings(findings,data.categories);assert.equal(groups.length,4);
  assert.equal(new Set(groups.flatMap(g=>g.subcategories.flatMap(c=>c.findings.map(f=>f.id)))).size,findings.length);
 }
});
test('header inherits the shared single-row navigation and title sizing',async()=>{
 const css=await read('public/theme.css');
 assert.doesNotMatch(css,/flex-direction:\s*column|\.nav-links[^}]*width:\s*100%/);
 assert.match(css,/font-size: clamp\(36px, 12vw, 76px\)/);
 assert.match(css,/\.reader-page \.nav-links \{ gap: 16px; font-size: 12px; \}/);
 const html=await read('public/audit/index.html');
 assert.match(html,/class="reader-intro audit-intro shell"/);
 assert.match(html,/id="audit-findings" class="audit-group-list"/);
});
