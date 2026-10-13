import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PHRASES} from '../public/script/highlights.mjs';
import {auditRange, trimRuns} from '../public/script/passage.mjs';
import {annotateRows} from '../public/script/audit.mjs';
import {DOSSIERS, dossierEvidence, corrected} from '../public/audit/dossiers.mjs';
const read = p => JSON.parse(fs.readFileSync(new URL('../public/data/' + p + '.json',import.meta.url)));
const data = read('audit/index');
const editions = {WH:'witch-hunt',MG:'mangagamer',UP:'umineko-project'};
test('every reviewed phrase exists on an actual anchored comparison row', () => {
  for (const [id, byEdition] of Object.entries(PHRASES)) {
    const finding = data.findings.find(f => f.id === id); assert.ok(finding, id);
    for (const [edition, phrases] of Object.entries(byEdition)) for (const phrase of phrases) {
      let found = false;
      for (const c of finding.contexts) {
        const comparisons = read('comparisons/' + editions[edition] + '/' + c.chapter).rows;
        for (const ref of (c.findingRefs || c.readerRefs)?.[edition] || []) {
          const text = comparisons[ref]?.text || '';
          if (auditRange(text,phrase)) found = true;
        }
      }
      assert.ok(found, id + '/' + edition + ': ' + phrase);
    }
  }
});
test('missing or oversized evidence never falls back to highlighting the whole row', () => {
  assert.equal(auditRange('This is the row.', 'Before. This is the row. After.'),null);
  const row={ref:'r',jaText:'原文',comparisons:{mangagamer:{text:'One sentence. Another sentence.'}}};
  annotateRows([row],{findings:[{id:'NO-PHRASE',editions:['MG'],contexts:[{chapter:'x',MG:row.comparisons.mangagamer.text,dispositions:{MG:'retained'},findingRefs:{MG:['r']}}]}]},'x',['mangagamer']);
  assert.deepEqual(row.comparisons.mangagamer.findings[0].highlights,[]);
});
test('every finding in the reported portrait/epitaph chapter has a phrase plan for each applicable edition', () => {
  const chapter=read('audit/chapters/umi1_5');
  for (const f of chapter.findings.filter(f=>f.kind!=='PC')) for (const edition of f.editions) {
    assert.ok(PHRASES[f.id]?.[edition]?.length, f.id+'/'+edition);
  }
});
test('display trims outer padding but preserves verse breaks and styles', () => {
  assert.deepEqual(trimRuns([['\n\nFirst line.\n',['red']],['Second line.\n ',['i']]]),[['First line.\n',['red']],['Second line.',['i']]]);
  for (const edition of ['pc','ps3']) {
    const row=read(edition+'/umi1_5').rows.find(r=>r.ref==='umi1_5-L0948');
    const en=row.en.map(r=>r[0]).join('');
    assert.match(en,/awaits you\.\nThere seek/);
    assert.match(en,/without end\.\nThere sleeps/);
    assert.equal(en.replace(/\s+/g,' ').trim(),row.enText);
  }
});
test('all original categories have exactly one dossier home under their original family', () => {
  assert.equal(DOSSIERS.length,15);
  const categoryIds=DOSSIERS.flatMap(d=>d.categories);
  assert.equal(new Set(categoryIds).size,categoryIds.length);
  assert.deepEqual(new Set(categoryIds),new Set(data.categories.map(c=>c.id)));
  for (const d of DOSSIERS) {
    assert.ok(d.categories.every(c=>c.startsWith(d.family+'.')));
    for (const key of ['claim','japanesePattern','translationEffect','limits']) assert.ok(d[key].length>40);
  }
});
test('dossiers retain all findings, exclude PC notes, and distinguish actual corrected examples', () => {
  for (const edition of ['WH','MG','UP']) {
    const findings=data.findings.filter(f=>f.kind!=='PC'&&f.editions.includes(edition));
    const dossiers=DOSSIERS.map(d=>dossierEvidence(d,findings,data.findings,edition));
    assert.deepEqual(new Set(dossiers.flatMap(d=>d.findings.map(f=>f.id))),new Set(findings.map(f=>f.id)));
    for (const d of dossiers) {
      assert.equal(d.examples.length,3);
      for (const e of d.examples) {
        assert.ok(d.findings.includes(e.finding));
        assert.ok((e.context.findingRefs||e.context.readerRefs)[edition].length);
        assert.ok(!corrected(e.context.dispositions?.[edition]));
      }
      for (const e of d.counterexamples) {
        assert.ok(corrected(e.context.dispositions[e.edition]));
        assert.ok(e.context.note && e.context[e.edition]);
        if (edition!=='WH') assert.equal(e.edition,edition);
      }
    }
  }
});
