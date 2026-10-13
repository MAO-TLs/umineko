import fs from 'node:fs';
const root = new URL('../', import.meta.url);
const read = file => JSON.parse(fs.readFileSync(new URL(file, root), 'utf8'));
const audit = read('public/data/audit/index.json');
const report = read('audit-anchor-review.json');
const groups = new Map();
for (const item of report.contextOnly) {
  const key = item.id + '|' + item.chapter;
  if (!groups.has(key)) groups.set(key, {...item, editions: [], refs: []});
  const group = groups.get(key);
  group.editions = [...new Set([...group.editions, item.edition])];
  group.refs = [...new Set([...group.refs, ...item.contextRefs])];
}
const reviewURL = new URL('scripts/anchor-review-cases.json',root);
const reviewEntries = fs.existsSync(reviewURL) ? read('scripts/audit-anchor-overrides.json').entries : [];
const cases = fs.existsSync(reviewURL) ? read('scripts/anchor-review-cases.json').map(item=>{
  const f=audit.findings.find(f=>f.id===item.id);
  const receipts=reviewEntries.filter(e=>e.id===item.id&&e.chapter===item.chapter);
  return {...item,refs:[...new Set(receipts.flatMap(e=>f.contexts[e.contextIndex].readerRefs[e.edition]))]};
}) : [...groups.values()];
if (process.argv.includes('--inventory')) {
  console.log(JSON.stringify(cases));
} else {
  const start = Number(process.argv[2] || 0), count = Number(process.argv[3] || 10);
  for (const [offset, item] of cases.slice(start, start + count).entries()) {
    const f = audit.findings.find(f => f.id === item.id);
    const rows = read('public/data/ps3/' + item.chapter + '.json').rows;
    console.log(`\n#${start + offset} ${item.id} ${item.chapter} ${item.editions.join('/')}`);
    console.log(f.description);
    if (f.kind === 'WH') console.log(f.contexts.filter(c => c.chapter === item.chapter).map(c => c.note).join(' | '));
    for (const row of rows.filter(r => item.refs.includes(r.ref))) console.log(row.start + ': ' + row.jaText);
  }
}
