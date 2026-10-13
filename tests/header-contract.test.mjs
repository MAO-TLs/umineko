import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {WITHHELD_WH} from '../public/audit/audit.mjs';
const read=p=>readFile(new URL('../public/'+p,import.meta.url),'utf8');
test('translation uses three immediate-switch buttons, without the redundant submit control',async()=>{
 const html=await read('audit/index.html'),js=await read('audit/audit.mjs');
 assert.deepEqual([...html.matchAll(/data-audit-script="([^"]+)"/g)].map(m=>m[1]),['witch-hunt','umineko-project','mangagamer']);
 assert.doesNotMatch(html,/View audit|<select id="audit-script"/);
 assert.match(js,/button\.addEventListener\('click'/);
 assert.match(js,/button\.setAttribute\('aria-pressed'/);
});
test('WH shows documented withheld candidates rather than episode count',async()=>{
 assert.equal(WITHHELD_WH,23);
 const js=await read('audit/audit.mjs');
 assert.match(js,/Candidates withheld/);
 assert.doesNotMatch(js,/Episodes reviewed/);
});
test('script header uses the shared version eyebrow and corpus introduction',async()=>{
 const html=await read('script/index.html');
 assert.match(html,/<p class="eyebrow">Script version v1\.0\.0<\/p>/);
 assert.match(html,/<h1>Script browser<\/h1>/);
 assert.match(html,/Search 49,115 PC passages or 49,553 PS3 passages across 163 scripts/);
 assert.doesNotMatch(html,/Umineko no Naku Koro ni · Read online/);
});
test('audit header follows the source-only convention and names the selected translation',async()=>{
 const html=await read('audit/index.html'),js=await read('audit/audit.mjs');
 assert.match(html,/<p class="eyebrow">Source-only editorial audit<\/p>/);
 assert.match(html,/<h1 id="audit-title">Witch Hunt translation audit<\/h1>/);
 assert.match(js,/\$\('audit-title'\)\.textContent = COMPARISONS\[key\]\.label \+ ' translation audit'/);
 assert.doesNotMatch(html,/Completed story-prose audit|<h1>Translation audits/);
});
test('both title blocks retain the canonical typography and spacing rules',async()=>{
 const css=await read('mao-reader-template.css');
 assert.match(css,/\.reader-page \.reader-intro \{ padding-block: 54px 62px; \}/);
 assert.match(css,/font-size: clamp\(46px, 6vw, 78px\)/);
 assert.match(css,/\.reader-page \.reader-intro > p:last-of-type \{\s*max-width: 680px;/);
 assert.match(css,/\.reader-page \.reader-intro \{ padding-block: 42px 50px; \}/);
});
