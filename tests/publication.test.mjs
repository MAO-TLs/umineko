import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const read=p=>readFile(new URL('../'+p,import.meta.url));
test('publication matches every verified public file and contains no extra files',async()=>{
  const manifest=JSON.parse(await read('publication-manifest.json'));
  const walk=async dir=>{let out=[];for(const e of await readdir(new URL('../'+dir,import.meta.url),{withFileTypes:true})){const p=dir+'/'+e.name;out.push(...(e.isDirectory()?await walk(p):[p]));}return out;};
  assert.deepEqual((await walk('public')).sort(),Object.keys(manifest).sort());
  for(const [p,hash] of Object.entries(manifest)){
    const bytes=await read(p);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),hash,p);
    assert.ok(bytes.length<100*1024*1024,p);
    if(/\.(json|html|mjs|css|txt)$/.test(p))assert.doesNotMatch(bytes.toString(),/\/Users\/fletcher|\/var\/folders|\/private\/var|private\/audits/);
  }
});
test('release has eight valid episode links, complete editions and public download metadata',async()=>{
  const html=(await read('public/index.html')).toString();
  const index=JSON.parse(await read('public/data/index.json'));
  const release=JSON.parse(await read('release.json'));
  assert.equal((html.match(/class="chapter-card"/g)||[]).length,8);
  for(let ep=1;ep<=8;ep++)assert.ok(html.includes('section='+ep+'&amp;script='+index.scripts.find(s=>s.episode===ep).id));
  assert.ok(html.includes('https://github.com/MAO-TLs/umineko/releases/download/v'+release.version+'/'+release.file));
  assert.match(html,/release-status">Released/);
  assert.doesNotMatch(html,/noindex|— Preview|Coming soon/);
  const totals={pc:0,ps3:0};
  for(const meta of index.scripts)for(const edition of ['pc','ps3']){
    const data=JSON.parse(await read('public/data/'+edition+'/'+meta.id+'.json'));
    assert.equal(data.rows.length,meta.rows[edition]);
    assert.equal(new Set(data.rows.map(r=>r.ref)).size,data.rows.length);
    totals[edition]+=data.rows.length;
  }
  assert.deepEqual(totals,{pc:49115,ps3:49553});
});
