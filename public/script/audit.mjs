// Audit annotations are a separate projection; comparator and MAO texts stay intact.
export const AUDIT_EDITIONS = { 'witch-hunt': 'WH', mangagamer: 'MG', 'umineko-project': 'UP' };
const clean = /^(correct|preserv|accept|not_this|no_|core_error_corrected|rephrased_no)|not_applicable|source_edition_changed|^not_recorded$/;
export function applies(finding, context, key) {
  const edition = AUDIT_EDITIONS[key];
  return finding.editions?.includes(edition) && (edition === 'WH' || finding.kind === 'PC' || !clean.test(context.dispositions?.[edition] || 'not_recorded'));
}
export function annotateRows(rows, audit, chapter, keys) {
  const byRef = new Map(rows.map(row => [row.ref, row]));
  for (const finding of audit.findings || []) for (const context of finding.contexts || []) {
    if (context.chapter !== chapter) continue;
    for (const key of keys) {
      if (!applies(finding, context, key)) continue;
      const edition = AUDIT_EDITIONS[key];
      // The exporter binds WH to original-PC source rows independently of PS3.
      const refs = context.readerRefs?.[edition] || (edition !== 'WH' && context.readerRef ? [context.readerRef] : []);
      for (const ref of refs) {
        const comparison = byRef.get(ref)?.comparisons?.[key];
        if (!comparison) continue;
        const quote = context[edition] || '';
        const annotation = { id: finding.id, kind: finding.kind,
          category: finding.kind === 'PC' ? '' : (finding.categories || []).map(c => c.split('.').pop().replaceAll('_', ' ')).join(' · '),
          explanation: finding.description, contextNote: context.note,
          highlight: quote && comparison.text?.includes(quote) ? quote : comparison.text && quote.includes(comparison.text) ? comparison.text : '',
          japanese: edition === 'WH' || finding.kind === 'PC' ? context.japanesePC : context.japanesePS3,
          sourceLabel: edition === 'WH' || finding.kind === 'PC' ? 'Original PC Japanese' : 'PS3-derived Japanese',
          sourceReading: finding.sourceReading,
          href: '../audit/?script=' + key + '&finding=' + encodeURIComponent(finding.id) + '#' + encodeURIComponent(finding.id) };
        comparison.findings ||= [];
        if (!comparison.findings.some(f => f.id === finding.id)) comparison.findings.push(annotation);
      }
    }
  }
  return rows;
}
export function annotateGroups(rows) {
  for (const row of rows) if (row.members) {
    const findings = new Map();
    for (const member of row.members) for (const finding of member.comparisons?.['witch-hunt']?.findings || []) findings.set(finding.id, finding);
    row.comparisonGroup = { ...row.comparisonGroup, findings: [...findings.values()] };
  }
  return rows;
}
