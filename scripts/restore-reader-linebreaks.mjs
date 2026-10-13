// Restore only explicit native {n} boundaries; never reflow or replace prose.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const root = new URL('../', import.meta.url);
const patch = new URL('../../../outputs/umineko-translation/patch-work/', import.meta.url);
const normalize = s => s.replace(/\s+/g, ' ').trim();
const visible = s => s.replace(/^`|`$/g,'').replaceAll('{n}', '\n').replaceAll('{t}', '  ').replace(/\{[a-z](?::[^}:]+)?:|\}/g,'');
const sha = s => createHash('sha256').update(s).digest('hex');
let changed = [];
for (const edition of ['pc','ps3']) for (const name of fs.readdirSync(new URL(`public/data/${edition}/`,root))) {
  if (!/^umi[1-8]_.+\.json$/.test(name)) continue;
  const chapter = name.slice(0,-5), ep=chapter[3];
  const locale = new URL(`${edition==='pc'?'pc-locale-source':'locale-source'}/story/ep${ep}/mao/${chapter}.txt`,patch);
  const native = fs.readFileSync(locale,'utf8'), lines=native.trimEnd().split('\n');
  const path = new URL(`public/data/${edition}/${name}`,root), data=JSON.parse(fs.readFileSync(path,'utf8'));
  let dirty=false;
  for (const row of data.rows) {
    if(row.kind!=='native'||!row.start||!row.end) continue;
    const raw=lines.slice(row.start-1,row.end).map(visible).join(' ');
    if(!raw.includes('\n')) continue;
    const old=row.en.map(r=>r[0]).join('');
    if(normalize(raw)!==normalize(old)) throw Error(`Prose differs: ${edition}/${row.ref}`);
    // Identify boundaries by their non-whitespace character offset, independent
    // of source row splits. Keep the existing styles and manuscript paragraphs.
    const breaks=new Map(); let offset=0;
    for(const part of raw.match(/\s+|\S+/g)||[]) {
      if(/\S/.test(part)) offset+=part.length;
      else if(part.includes('\n')) breaks.set(offset,(part.match(/\n/g)||[]).length);
    }
    const chars=row.en.flatMap(([text,styles])=>Array.from(text,c=>({c,styles})));
    let out=[], at=0;
    for(let i=0;i<chars.length;) {
      if(/\s/.test(chars[i].c)) {
        let j=i;while(j<chars.length&&/\s/.test(chars[j].c))j++;
        const value=chars.slice(i,j).map(x=>x.c).join('');
        const n=Math.max(breaks.get(at)||0,(value.match(/\n/g)||[]).length);
        out.push({c:n?'\n'.repeat(n):value,styles:chars[i].styles});i=j;
      } else {out.push(chars[i]);at+=chars[i].c.length;i++;}
    }
    const runs=[];for(const {c,styles} of out) {
      if(runs.length&&JSON.stringify(runs.at(-1)[1])===JSON.stringify(styles))runs.at(-1)[0]+=c;
      else runs.push([c,styles]);
    }
    const restored=runs.map(r=>r[0]).join('');
    if(restored===old)continue;
    if(normalize(restored)!==normalize(old))throw Error(`Token change: ${row.ref}`);
    row.en=runs;dirty=true;changed.push({edition,ref:row.ref,nativeSha256:sha(native)});
  }
  if(dirty)fs.writeFileSync(path,JSON.stringify(data)+'\n');
}
console.log(JSON.stringify({restoredPassages:changed.length,editions:Object.fromEntries(['pc','ps3'].map(e=>[e,changed.filter(c=>c.edition===e).length])),sample:changed.slice(0,4)}));
