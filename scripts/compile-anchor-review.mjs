// Compile the manually selected passage numbers into stable, fingerprinted receipts.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {applies} from '../public/script/audit.mjs';
import {findingRefs} from '../public/script/anchors.mjs';
const root = new URL('../', import.meta.url);
const read = p => JSON.parse(fs.readFileSync(new URL(p,root),'utf8'));
const write = (p,v) => fs.writeFileSync(new URL(p,root),JSON.stringify(v,null,2)+'\n');
const hash = v => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const audit = read('public/data/audit/index.json');
const selections = read('scripts/anchor-selections.json');
const inventoryPath = 'scripts/anchor-review-cases.json';
if (!fs.existsSync(new URL(inventoryPath,root))) {
  const groups = new Map();
  for (const x of read('audit-anchor-review.json').contextOnly) {
    const key=x.id+'|'+x.chapter;
    if(!groups.has(key))groups.set(key,{id:x.id,chapter:x.chapter,editions:[]});
    const g=groups.get(key);if(!g.editions.includes(x.edition))g.editions.push(x.edition);
  }
  write(inventoryPath,[...groups.values()]);
}
const cases = read(inventoryPath);
const notes = {
  '246:UP': 'The record gives UP a separate_word_choice_defect disposition, but neither its description nor source reading identifies that defect. UP has both opening quotation marks criticized in MG. No defensible anchor for the published explanation.',
  '449:MG': 'The record marks MG partly_correct, but the published explanation exclusively criticizes UP for completed suicide. MG says planned to commit suicide. Attaching the UP explanation to MG would misrepresent its wording.'
};
const entries=[];
for(const [i,item] of cases.entries()) {
  const choice=selections[i];if(!choice)throw Error('Missing manual selection '+i);
  const f=audit.findings.find(f=>f.id===item.id);
  const rows=read('public/data/ps3/'+item.chapter+'.json').rows;
  for(const edition of item.editions) {
    const key=edition==='MG'?'mangagamer':'umineko-project';
    const comparison=read('public/data/comparisons/'+key+'/'+item.chapter+'.json').rows;
    const numbers=Array.isArray(choice)?choice:choice[edition];
    if(!numbers)throw Error('Missing edition selection '+i+edition);
    const selected=numbers.map(n=>{const r=rows.find(r=>r.start===n);if(!r)throw Error('No row '+i+':'+n);return r;});
    for(const [contextIndex,c] of f.contexts.entries()) {
      if(c.chapter!==item.chapter || !c.readerRefs?.[edition]?.length || findingRefs(f,{...c,findingRefs:undefined},edition,rows).length)continue;
      let chosen=selected.filter(r=>c.readerRefs[edition].includes(r.ref));
      let note='';
      if(i===16) {chosen=selected;note='The imported context starts at 58, after the actual disputed reply at 57. Reviewed the adjacent Japanese まあね and both Who knows translations; move the anchor back one passage.';}
      const active=applies(f,c,key);
      const status=!active?'not-applicable':numbers.length?'anchored':'withheld';
      if(!active)chosen=[];
      if(status==='anchored'&&!chosen.length)throw Error('Selection outside context '+i+' '+edition+' '+contextIndex);
      if(status==='withheld')note=notes[i+':'+edition]||'';
      if(status==='withheld'&&!note)throw Error('Missing withholding reason');
      const canonical={...c};delete canonical.findingRefs;delete canonical.findingEvidence;
      entries.push({id:f.id,chapter:c.chapter,contextIndex,edition,status,note,
        contextHash:hash(canonical),judgmentHash:hash([f.description,f.sourceReading,c.note,c.dispositions]),
        refs:chosen.map(r=>r.ref),evidence:chosen.map(r=>{
          const text=comparison[r.ref]?.text;if(typeof text!=='string')throw Error('Missing comparison '+r.ref);
          return {ref:r.ref,japanese:r.jaText,translation:text,sha256:hash([r.jaText,text])};
        })});
    }
  }
}
write('scripts/audit-anchor-overrides.json',{version:1,cases:cases.length,entries});
console.log(JSON.stringify({cases:cases.length,receipts:entries.length,statuses:entries.reduce((a,e)=>(a[e.status]=(a[e.status]||0)+1,a),{})}));
