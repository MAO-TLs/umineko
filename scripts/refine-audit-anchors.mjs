import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {findingRefs} from '../public/script/anchors.mjs';
import {reviewedRefs, review} from './reviewed-audit-anchors.mjs';
import {applies} from '../public/script/audit.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const dataRoot = path.join(root, 'public/data');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const audit = read(path.join(dataRoot, 'audit/index.json'));
const chapters = new Map();
const comparisons = new Map();
const report = {reviewed: review.entries.filter(e=>e.status==='anchored').length, withheld: review.entries.filter(e=>e.status==='withheld').map(({id,chapter,edition,note})=>({id,chapter,edition,note})), narrowed: [], contextOnly: []};
for (const finding of audit.findings) for (const [contextIndex, context] of finding.contexts.entries()) {
  if (!context.chapter) continue;
  if (!chapters.has(context.chapter)) chapters.set(context.chapter, read(path.join(dataRoot, 'ps3', context.chapter + '.json')).rows);
  // Recompute from the original context refs on every run (idempotent).
  delete context.findingRefs;
  const resolved = {};
  for (const edition of ['WH', 'MG', 'UP']) {
    const refs = reviewedRefs(finding, context, contextIndex, edition, chapters.get(context.chapter)) ?? findingRefs(finding, context, edition, chapters.get(context.chapter));
    resolved[edition] = refs;
    if (!applies(finding,context,{WH:'witch-hunt',MG:'mangagamer',UP:'umineko-project'}[edition])) continue;
    const original = context.readerRefs?.[edition] || [];
    if (original.length && !refs.length) report.contextOnly.push({id:finding.id, chapter:context.chapter, edition, contextRefs:original});
    else if (refs.length < original.length) report.narrowed.push({id:finding.id, chapter:context.chapter, edition, refs, contextRefs:original});
  }
  context.findingRefs = resolved;
  context.findingEvidence = {};
  for (const [edition, key] of [['MG','mangagamer'],['UP','umineko-project']]) {
    const refs = resolved[edition];
    if (!refs.length) continue;
    const filename = key + '/' + context.chapter;
    if (!comparisons.has(filename)) comparisons.set(filename, read(path.join(dataRoot,'comparisons',filename + '.json')).rows);
    const selected = chapters.get(context.chapter).filter(r => refs.includes(r.ref));
    const translated = refs.map(ref => comparisons.get(filename)[ref]?.text);
    if (selected.length === refs.length && translated.every(text => typeof text === 'string')) context.findingEvidence[edition] = {
      japanese: selected.map(r => r.jaText).join('\n'), translation: translated.join('\n')
    };
  }
}
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value) + '\n');
write(path.join(dataRoot, 'audit/index.json'), audit);
for (const file of fs.readdirSync(path.join(dataRoot, 'audit/chapters'))) {
  if (!file.endsWith('.json')) continue;
  const chapter = file.slice(0, -5);
  write(path.join(dataRoot, 'audit/chapters', file), {findings:audit.findings.filter(f => f.contexts.some(c => c.chapter === chapter)).map(f => ({...f, contexts:f.contexts.filter(c => c.chapter === chapter)}))});
}
write(path.join(root, 'audit-anchor-review.json'), report);
console.log(JSON.stringify({narrowedEditionContexts:report.narrowed.length, contextOnlyEditionContexts:report.contextOnly.length}));
