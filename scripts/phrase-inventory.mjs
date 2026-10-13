// Build review candidates, not publication evidence. Nothing from this inventory
// is rendered until selected into the reviewed phrase receipts.
import fs from 'node:fs';
import {PHRASES} from '../public/script/highlights.mjs';
import {applies} from '../public/script/audit.mjs';
const root=new URL('../',import.meta.url), read=p=>JSON.parse(fs.readFileSync(new URL(p,root)));
const data=read('public/data/audit/index.json');
const keys={WH:'witch-hunt',MG:'mangagamer',UP:'umineko-project'},cache=new Map();
const get=(e,ch)=>{const key=e+'/'+ch;if(!cache.has(key))cache.set(key,read('public/data/comparisons/'+keys[e]+'/'+ch+'.json').rows);return cache.get(key)};
const words=s=>[...String(s).matchAll(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)].map(m=>({s:m[0].toLowerCase().replaceAll('’',"'"),start:m.index,end:m.index+m[0].length}));
const stop=new Set('a an the of to for in on at by with and or but as if than that this these those it its is was were be been being have has had do does did not no yes one two all any some there here which who whom whose what how when where why while so then from into out up down over under through about he she they we you i him her them us me his their our your my would could should will can may might must just very more much only also even still instead both source japanese english wh mg up translation says makes renders becomes adds changes describes gives calls'.split(' '));
function candidates(text,analysis) {
 const ts=words(text), matches=[];
 for(const evidence of analysis.filter(Boolean)) {
  const es=words(evidence);
  for(let i=0;i<ts.length;i++)for(let j=0;j<es.length;j++) {
   if(ts[i].s!==es[j].s)continue;
   let n=0;while(i+n<ts.length&&j+n<es.length&&ts[i+n].s===es[j+n].s)n++;
   let left=i,right=i+n;while(left<right&&stop.has(ts[left].s))left++;
   while(right>left&&stop.has(ts[right-1].s))right--;
   if(right<=left)continue;
   const content=ts.slice(left,right).filter(w=>!stop.has(w.s));
   if(content.length<1 || right-left<2&&content[0].s.length<5)continue;
   const phrase=text.slice(ts[left].start,ts[right-1].end);
   const score=content.length*3+(right-left)*.6;
   matches.push({phrase,score,start:ts[left].start,end:ts[right-1].end});
  }
 }
 const selected=[];
 for(const m of matches.sort((a,b)=>b.score-a.score||a.start-b.start)) {
  if(selected.some(x=>x.start<=m.start&&x.end>=m.end))continue;
  selected.push(m);if(selected.length===5)break;
 }
 return selected.map(({phrase})=>phrase);
}
const inventory=[];
for(const f of data.findings.filter(f=>f.kind!=='PC')) {
 const units=[];
 for(const [ci,c]of f.contexts.entries())for(const e of f.editions) {
  if(!applies(f,c,keys[e]))continue;
  const refs=c.findingRefs?.[e]||[];
  for(const ref of refs) {
   const text=get(e,c.chapter)[ref]?.text;if(!text)continue;
   const existing=PHRASES[f.id]?.[e];
   const same=units.find(u=>u.text===text&&u.note===(c.note||''));
   const occurrence={contextIndex:ci,edition:e,chapter:c.chapter,ref};
   if(same){same.occurrences.push(occurrence);continue;}
   units.push({text,note:c.note||'',japanese:c.findingEvidence?.[e]?.japanese||c.japanesePC||c.japanesePS3,candidates:existing||candidates(text,[f.description,c.note,f.sourceReading]),existing:!!existing,occurrences:[occurrence]});
  }
 }
 inventory.push({n:inventory.length,id:f.id,description:f.description,sourceReading:f.sourceReading,units});
}
fs.writeFileSync(new URL('scripts/phrase-review-cases.json',root),JSON.stringify(inventory,null,2)+'\n');
console.log({findings:inventory.length,units:inventory.reduce((n,f)=>n+f.units.length,0),existing:inventory.reduce((n,f)=>n+f.units.filter(u=>u.existing).length,0),noCandidates:inventory.reduce((n,f)=>n+f.units.filter(u=>!u.candidates.length).length,0)});
// Compact review: display editorial explanation and proposed spans; --full also
// prints the exact comparator passage for disambiguation.
const start=Number(process.argv[2]||0),end=Number(process.argv[3]||0);
for(const f of inventory.slice(start,end))console.log(JSON.stringify({n:f.n,id:f.id,why:f.description,units:f.units.map((u,i)=>({i,e:[...new Set(u.occurrences.map(o=>o.edition))].join('/'),p:u.candidates,...(process.argv.includes('--full')?{text:u.text,note:u.note}: {})}))}));
