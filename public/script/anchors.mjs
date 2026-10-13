// Context windows are evidence, not a list of independently defective passages.
const normalizeSource = value => String(value || '').normalize('NFKC').replace(/[\p{P}\p{Z}\s]/gu, '');

export function findingRefs(finding, context, edition, rows) {
  if (context.findingRefs) return context.findingRefs[edition] || [];
  const refs = context.readerRefs?.[edition] || [];
  // Original WH anchors were exported from its exact historical source lines.
  if (edition === 'WH' || finding.kind === 'PC' || refs.length <= 1) return refs;
  // Inherited defects have a separately cited original-Japanese passage. Bind
  // that complete passage within the paired context, never by English similarity
  // or merely by overlapping a broad review window.
  if (finding.kind !== 'WH') return [];
  const needle = normalizeSource(context.japanesePC);
  if (needle.length < 8) return [];
  const candidates = rows.filter(row => refs.includes(row.ref));
  const spans = []; let combined = '';
  for (const row of candidates) {
    const start = combined.length; combined += normalizeSource(row.jaText);
    spans.push({ref: row.ref, start, end: combined.length});
  }
  const start = combined.indexOf(needle);
  if (start < 0 || combined.indexOf(needle, start + 1) >= 0) return [];
  return spans.filter(span => span.start < start + needle.length && span.end > start).map(span => span.ref);
}
