import test from 'node:test';
import assert from 'node:assert/strict';
import { renderPassage, styledText } from '../public/script/passage.mjs';
const node=tag=>({tag,children:[],dataset:{},style:{setProperty(){}},classList:{add(){}},
 append(...children){this.children.push(...children)},setAttribute(k,v){this[k]=v}});
const document={createElement:node,createTextNode:text=>({...node('#text'),textContent:text})};
const all=n=>[n,...n.children.flatMap(all)];
const row={ref:'example-L0001',start:1,end:2,speaker:'MAO name',speakerJa:'日本語名',ja:[['日本語',[]]],en:[['English',['i','red']]],
 comparisons:{'umineko-project':{text:'UP phrase',speaker:'UP name'},mangagamer:{text:'MG phrase',speaker:'MG name',findings:[{highlight:'MG phrase',explanation:'Source note'}]}}};
test('each comparison keeps its own name rather than MAO spelling',()=>{
 const out=renderPassage(document,row,{script:'ps3',compare:'both'});
 for(const [key,name] of [['mao-ps3','MAO name'],['umineko-project','UP name'],['mangagamer','MG name']]){
   const cell=out.children.find(c=>c.dataset.corpus===key);assert.ok(all(cell).some(n=>n.textContent===name));
 }
});
test('errors remain inside the correct inline comparison cell with accessible triggers',()=>{
 const out=renderPassage(document,row,{script:'ps3',compare:'both'},new Set(['mangagamer']));
 const cell=out.children.find(c=>c.dataset.corpus==='mangagamer');
 const trigger=all(cell).find(n=>n.dataset.finding);
 assert.equal(trigger['aria-expanded'],'false');
 assert.ok(all(cell).some(n=>n.id===trigger['aria-controls']&&n.hidden));
 assert.equal(all(out).filter(n=>n.tag==='details').length,0);
});
test('source typography is preserved and no HTML is interpreted',()=>{
 const out=styledText(document,[['<script>not markup</script>',['red','i']]],'en');
 assert.equal(all(out).filter(n=>n.tag==='script').length,0);
 assert.ok(all(out).some(n=>n.tag==='em'));
 assert.ok(all(out).some(n=>n.className==='truth-red'));
});
test('unaligned comparison cells do not inherit MAO text or names',()=>{
 const out=renderPassage(document,row,{script:'pc',compare:'witch-hunt'});
 const cell=out.children.find(c=>c.dataset.corpus==='witch-hunt');
 assert.ok(all(cell).some(n=>n.textContent==='—'));
 assert.ok(!all(cell).some(n=>n.textContent==='MAO name'));
});
test('technical provenance stays hidden and genuine uncertainty is concise',()=>{
 for(const witness of ['Shared passage · PS3 Japanese witness','PS3 Japanese','PC Japanese witness · quiz reference']){
  const out=renderPassage(document,{...row,witness},{script:'pc',compare:'none'});
  assert.ok(!all(out).some(n=>n.textContent===witness));
  assert.ok(all(out).some(n=>n.textContent==='日本語'));
 }
 const witness='Japanese audio transcription · reading provisional';
 const out=renderPassage(document,{...row,witness},{script:'pc',compare:'none'});
 assert.ok(!all(out).some(n=>n.textContent===witness));
 assert.ok(all(out).some(n=>n.textContent==='Transcription uncertain'));
});
test('comparison cells omit import boilerplate and skipped graphics warnings',()=>{
 const comparison={text:'Original text',widerSourcePassage:true,witness:'Original WH ending graphic · manually transcribed'};
 let out=renderPassage(document,{...row,comparisons:{'witch-hunt':comparison}},{script:'pc',compare:'witch-hunt'});
 assert.ok(all(out).some(n=>n.textContent==='Original text'));
 assert.ok(!all(out).some(n=>n.className==='witness'));
 out=renderPassage(document,{...row,comparisons:{'witch-hunt':{status:'intentionally-skipped',unavailableReason:'Long technical explanation'}}},{script:'pc',compare:'witch-hunt'});
 assert.ok(all(out).some(n=>n.textContent==='—'));
 assert.ok(!all(out).some(n=>n.textContent==='Long technical explanation'));
});
test('audit highlights preserve the comparator styled runs and its complete text',()=>{
 const phrase='Red truth, emphasized ending';
 const source={...row,comparisons:{mangagamer:{text:phrase,runs:[['Red truth',['red']], [', ',[]], ['emphasized ending',['i']]],findings:[{id:'TEST-001',highlight:'truth, emphasized',explanation:'Evidence'}]}}};
 const out=renderPassage(document,source,{script:'ps3',compare:'mangagamer'},new Set(['mangagamer']));
 const cell=out.children.find(c=>c.dataset.corpus==='mangagamer');
 const paragraph=cell.children.find(n=>n.tag==='p');
 const content=n=>n.className==='todokanai-error-preview'?'':n.tag==='#text'?n.textContent:n.children.map(content).join('');
 assert.equal(content(paragraph),phrase);
 assert.ok(all(paragraph).some(n=>n.className==='truth-red'));
 assert.ok(all(paragraph).some(n=>n.tag==='em'));
 assert.ok(all(paragraph).some(n=>n.dataset.auditId==='TEST-001'));
});
test('PC material uses a yellow annotation with its exact label and no error row class',()=>{
 const classes=[];
 const doc={...document,createElement:tag=>{const n=node(tag);n.classList.add=c=>classes.push(c);return n}};
 const source={...row,comparisons:{mangagamer:{text:'Original PC material.',findings:[{id:'PC-001',kind:'PC',highlight:'Original PC material.',explanation:'Retained source material.'}]}}};
 const out=renderPassage(doc,source,{script:'ps3',compare:'mangagamer'},new Set(['mangagamer']));
 assert.ok(all(out).some(n=>n.className?.includes('pc-material-trigger')));
 assert.ok(all(out).some(n=>n.textContent==='Material added from original PC script'));
 assert.ok(!classes.includes('script-line-error'));
});
test('two offending phrases get independent accessible triggers without highlighting the intervening prose',()=>{
 const text='First error, correct middle, second error.';
 const source={...row,comparisons:{mangagamer:{text,findings:[{id:'TWO',highlights:['First error','second error'],explanation:'Two localized defects'}]}}};
 const out=renderPassage(document,source,{script:'ps3',compare:'mangagamer'},new Set(['mangagamer']));
 const triggers=all(out).filter(n=>n.dataset.auditId==='TWO');
 assert.equal(triggers.length,2);
 assert.notEqual(triggers[0]['aria-controls'],triggers[1]['aria-controls']);
 const content=n=>n.className==='todokanai-error-preview'?'':n.tag==='#text'?n.textContent:n.children.map(content).join('');
 assert.deepEqual(triggers.map(content),['First error','second error']);
 assert.deepEqual(triggers.map(n=>n['aria-label']),['First error','second error']);
 const cell=out.children.find(c=>c.dataset.corpus==='mangagamer');
 assert.equal(content(cell.children.find(n=>n.tag==='p')),text);
});
test('overlapping findings cover both entire phrases without duplicating text or hiding either note',()=>{
 const text='The first shared second phrase ends.';
 const source={...row,comparisons:{mangagamer:{text,findings:[{id:'FIRST',highlights:['first shared'],explanation:'First defect'},{id:'SECOND',highlights:['shared second'],explanation:'Second defect'}]}}};
 const out=renderPassage(document,source,{script:'ps3',compare:'mangagamer'},new Set(['mangagamer']));
 const cell=out.children.find(c=>c.dataset.corpus==='mangagamer');
 const p=cell.children.find(n=>n.tag==='p');
 const content=n=>n.className==='todokanai-error-preview'?'':n.tag==='#text'?n.textContent:n.children.map(content).join('');
 assert.equal(content(p),text);
 assert.equal(content(all(p).find(n=>n.dataset.auditId==='FIRST')),'first shared second');
 assert.ok(all(cell).some(n=>n.dataset.auditId==='SECOND'));
 assert.equal(all(cell).filter(n=>n.tag==='aside').length,2);
});
