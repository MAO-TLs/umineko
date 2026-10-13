import fs from 'node:fs';
import {createHash} from 'node:crypto';
const root = new URL('../', import.meta.url);
const read = p => JSON.parse(fs.readFileSync(new URL(p,root),'utf8'));
const hash = v => createHash('sha256').update(JSON.stringify(v)).digest('hex');
export const review = read('scripts/audit-anchor-overrides.json');
const records = new Map(review.entries.map(e=>[`${e.id}|${e.contextIndex}|${e.edition}`,e]));
if(records.size!==review.entries.length)throw Error('Duplicate anchor receipts');
const comparisons=new Map();
export function reviewedRefs(finding,context,contextIndex,edition,rows) {
  const receipt=records.get(`${finding.id}|${contextIndex}|${edition}`);
  if(!receipt)return undefined;
  const canonical={...context};delete canonical.findingRefs;delete canonical.findingEvidence;
  if(receipt.chapter!==context.chapter || receipt.contextHash!==hash(canonical) || receipt.judgmentHash!==hash([finding.description,finding.sourceReading,context.note,context.dispositions]))throw Error('Stale anchor review: '+finding.id+' '+edition);
  const key=(edition==='MG'?'mangagamer':'umineko-project')+'/'+context.chapter;
  if(!comparisons.has(key))comparisons.set(key,read('public/data/comparisons/'+key+'.json').rows);
  const corpus=comparisons.get(key);
  for(const evidence of receipt.evidence){
    const row=rows.find(r=>r.ref===evidence.ref);
    if(!row || hash([row.jaText,corpus[evidence.ref]?.text])!==evidence.sha256 || evidence.japanese!==row.jaText || evidence.translation!==corpus[evidence.ref]?.text)throw Error('Changed anchor source: '+finding.id+' '+evidence.ref);
  }
  if(JSON.stringify(receipt.refs)!==JSON.stringify(receipt.evidence.map(e=>e.ref)))throw Error('Anchor receipt mismatch '+finding.id);
  return receipt.refs;
}
