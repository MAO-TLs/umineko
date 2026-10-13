// Publication spans are selected by reviewers, never inferred from overlap scores.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {auditRange} from '../public/script/passage.mjs';
import {applyPhraseExclusions} from '../public/audit/phrase-links.mjs';
const root=new URL('../',import.meta.url);
const read=p=>JSON.parse(fs.readFileSync(new URL(p,root),'utf8'));
const check=process.argv.includes('--check');
const write=(p,v)=>{
  const text=JSON.stringify(v,null,2)+'\n',path=new URL(p,root);
  if(check){if(!fs.existsSync(path)||fs.readFileSync(path,'utf8')!==text)throw Error('Stale phrase publication: '+p);}
  else fs.writeFileSync(path,text);
};
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const inventory=read('scripts/phrase-review-cases.json');
const audit=read('public/data/audit/index.json');
const findings=new Map(audit.findings.map(f=>[f.id,f]));
const editions={WH:'witch-hunt',MG:'mangagamer',UP:'umineko-project'};
const selections={}, cache=new Map(), chapters=new Map(), receipts=[];
const approvals=read('scripts/phrase-exception-approvals.json');
for(const file of fs.readdirSync(new URL('scripts/',root)).filter(f=>/^phrase-selections-.*\.json$/.test(f)).sort()) {
  for(const [n,units] of Object.entries(read('scripts/'+file))) {
    if(selections[n])throw Error('Duplicate review ownership: '+n);
    selections[n]=units;
  }
}
const missing=[],blocked=[];
for(const item of inventory) {
  const f=findings.get(item.id);
  if(!f||f.description!==item.description||f.sourceReading!==item.sourceReading)throw Error('Stale judgment: '+item.id);
  for(const [i,unit] of item.units.entries()) {
    const chosen=selections[item.n]?.[i];
    if(!chosen){missing.push([item.n,i,item.id]);continue;}
    const exception=Array.isArray(chosen)?null:approvals[item.n+':'+i];
    if(!Array.isArray(chosen)&&(!exception||!chosen.reason)){blocked.push({n:item.n,unit:i,id:item.id,...chosen});continue;}
    if(Array.isArray(chosen)&&(!chosen.length||chosen.some(p=>typeof p!=='string'||!p.trim())))throw Error('Empty phrase: '+item.n+'/'+i);
    const phrases=exception?[]:[...new Set(chosen)];
    for(const p of phrases) {
      if(!auditRange(unit.text,p))throw Error('Unmatched phrase '+item.n+'/'+i+': '+JSON.stringify(p));
      const text=unit.text.replace(/\s+/g,' '),needle=p.replace(/\s+/g,' ').trim(),first=text.indexOf(needle);
      if(text.indexOf(needle,first+needle.length)>=0)throw Error('Ambiguous repeated phrase '+item.n+'/'+i+': '+JSON.stringify(p));
    }
    for(const o of unit.occurrences) {
      const c=f.contexts[o.contextIndex];
      if(!c||c.chapter!==o.chapter||(c.note||'')!==unit.note||!c.findingRefs?.[o.edition]?.includes(o.ref))throw Error('Stale anchor: '+item.n+'/'+i);
      const path='public/data/comparisons/'+editions[o.edition]+'/'+o.chapter+'.json';
      if(!cache.has(path))cache.set(path,read(path).rows);
      const text=cache.get(path)[o.ref]?.text;
      if(text!==unit.text)throw Error('Stale comparison: '+item.n+'/'+i);
      if(!chapters.has(o.chapter))chapters.set(o.chapter,{});
      const byFinding=chapters.get(o.chapter);
      const byRef=byFinding[item.id] ||= {};
      const byEdition=byRef[o.ref] ||= {};
      const value=exception?{kind:exception,reason:chosen.reason}:phrases;
      if(byEdition[o.edition]&&JSON.stringify(byEdition[o.edition])!==JSON.stringify(value))throw Error('Conflicting phrase receipts: '+item.id+'/'+o.ref+'/'+o.edition);
      byEdition[o.edition]=value;
      receipts.push({id:item.id,...o,phrases,...(exception?{exception,reason:chosen.reason}:{}),sha256:hash([f.description,f.sourceReading,c.note,c.dispositions,text])});
    }
  }
}
const additions=read('scripts/phrase-additions.json');
for(const a of additions) {
  const f=findings.get(a.id),c=f?.contexts[a.contextIndex];
  if(!c||c.chapter!==a.chapter||!a.reason)throw Error('Invalid added anchor '+a.id);
  for(const [edition,entry] of Object.entries(a.editions)) {
    const row=read('public/data/'+(edition==='WH'?'pc':'ps3')+'/'+a.chapter+'.json').rows.find(r=>r.ref===a.ref);
    const text=read('public/data/comparisons/'+editions[edition]+'/'+a.chapter+'.json').rows[a.ref]?.text;
    if(row?.jaText!==a.japanese||text!==entry.text||!entry.phrases.length||entry.phrases.some(p=>!auditRange(text,p)))throw Error('Stale added anchor '+a.id+'/'+edition);
    if(!chapters.has(a.chapter))chapters.set(a.chapter,{});
    const byRef=chapters.get(a.chapter)[a.id] ||= {};
    (byRef[a.ref] ||= {})[edition]=entry.phrases;
    receipts.push({id:a.id,contextIndex:a.contextIndex,chapter:a.chapter,edition,ref:a.ref,phrases:entry.phrases,added:true,...(a.replace?{replace:true}:{}),reason:a.reason,sha256:hash([f.description,f.sourceReading,c.note,c.dispositions,text,a.japanese])});
  }
}
const noteCorrections=read('scripts/phrase-note-corrections.json');
for(const n of noteCorrections) {
  const f=findings.get(n.id),c=f?.contexts[n.contextIndex];
  const text=read('public/data/comparisons/'+editions[n.edition]+'/'+n.chapter+'.json').rows[n.ref]?.text;
  if(c?.chapter!==n.chapter||c.note!==n.previousNote||text!==n.translation)throw Error('Stale phrase note correction '+n.id);
}
const report={findings:inventory.length,units:inventory.reduce((n,f)=>n+f.units.length,0),reviewedUnits:inventory.reduce((n,f)=>n+f.units.filter((_,i)=>Array.isArray(selections[f.n]?.[i])).length,0),reviewedExceptions:receipts.filter(r=>r.exception).length,receipts:receipts.length,missing,blocked};
write('phrase-review-report.json',report);
console.log(JSON.stringify({...report,missing:missing.length,blocked:blocked.length}));
if(missing.length||blocked.length) {
  if(!process.argv.includes('--partial'))throw Error('Corpus review incomplete; publication data was not changed.');
} else {
  write('scripts/reviewed-phrase-receipts.json',{version:1,entries:receipts});
  audit.phraseExclusions=receipts.filter(r=>r.exception==='anchor-mismatch').map(({id,contextIndex,edition,ref})=>({id,contextIndex,edition,ref}));
  audit.phraseAdditions=receipts.filter(r=>r.added).map(({id,contextIndex,edition,ref,replace})=>({id,contextIndex,edition,ref,...(replace?{replace:true}:{})}));
  audit.phraseNoteCorrections=noteCorrections.map(({id,contextIndex,note})=>({id,contextIndex,note}));
  audit.phraseEvidence=[];
  const projected=applyPhraseExclusions(structuredClone(audit));
  for(const f of projected.findings.filter(f=>f.kind!=='PC'))for(const [contextIndex,c] of f.contexts.entries())for(const edition of f.editions) {
    const original=findings.get(f.id).contexts[contextIndex];
    const ref=c.findingRefs?.[edition]?.[0];
    if(!ref||ref===original.findingRefs?.[edition]?.[0])continue;
    const translation=read('public/data/comparisons/'+editions[edition]+'/'+c.chapter+'.json').rows[ref]?.text;
    const row=read('public/data/'+(edition==='WH'?'pc':'ps3')+'/'+c.chapter+'.json').rows.find(r=>r.ref===ref);
    const added=additions.find(a=>a.id===f.id&&a.contextIndex===contextIndex&&a.ref===ref&&a.editions[edition]);
    const japanese=edition==='WH'?(added?.japanese||original.japanesePC):row?.jaText;
    if(!translation||!japanese)throw Error('Missing relocated audit evidence '+f.id+'/'+ref);
    audit.phraseEvidence.push({id:f.id,contextIndex,edition,ref,japanese,translation});
  }
  write('public/data/audit/index.json',audit);
  for(const file of fs.readdirSync(new URL('public/data/audit/chapters/',root))) {
    const path='public/data/audit/chapters/'+file, data=read(path);
    data.phrases=chapters.get(file.replace(/\.json$/,''))||{};
    data.phraseAdditions=receipts.filter(r=>r.added&&r.chapter===file.replace(/\.json$/,'')).map(({id,edition,ref})=>({id,edition,ref}));
    data.phraseNoteCorrections=noteCorrections.filter(n=>n.chapter===file.replace(/\.json$/,'')).map(({id,previousNote,note})=>({id,previousNote,note}));
    write(path,data);
  }
}
