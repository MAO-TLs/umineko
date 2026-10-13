import fs from 'node:fs';
import {auditRange} from '../public/script/passage.mjs';
const root=new URL('../',import.meta.url);
const inventory=JSON.parse(fs.readFileSync(new URL('scripts/phrase-review-cases.json',root)));
const requested=process.argv[2];
const files=fs.readdirSync(new URL('scripts/',root)).filter(f=>/^phrase-selections-.*\.json$/.test(f)&&(!requested||f===requested));
const errors=[];let findings=0,units=0;
for(const file of files)for(const [n,selected] of Object.entries(JSON.parse(fs.readFileSync(new URL('scripts/'+file,root))))) {
  findings++;
  const finding=inventory[n];if(!finding){errors.push({file,n,error:'Unknown finding'});continue;}
  for(const [i,unit] of finding.units.entries()) {
    units++;const phrases=selected[i];
    if(!phrases){errors.push({file,n,i,error:'Missing unit decision'});continue;}
    if(!Array.isArray(phrases)){if(!phrases.reason)errors.push({file,n,i,error:'Missing exception reason'});continue;}
    if(!phrases.length)errors.push({file,n,i,error:'Empty phrase list'});
    for(const p of phrases) {
      if(typeof p!=='string'||!auditRange(unit.text,p)){errors.push({file,n,i,phrase:p,error:'Unmatched literal'});continue;}
      const text=unit.text.replace(/\s+/g,' '),needle=p.replace(/\s+/g,' ').trim(),first=text.indexOf(needle);
      if(text.indexOf(needle,first+needle.length)>=0)errors.push({file,n,i,phrase:p,error:'Repeated literal; select unique context'});
    }
  }
}
console.log(JSON.stringify({findings,units,errors},null,2));
process.exitCode=errors.length?1:0;
