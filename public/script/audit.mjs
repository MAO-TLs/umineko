// Audit annotations are a separate projection; comparator and MAO texts stay intact.
import { findingRefs } from './anchors.mjs?v=anchors-20261014-1';
import { phraseHighlights } from './highlights.mjs?v=phrases-20261014-1';
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
      const refs = [...new Set([...findingRefs(finding, context, edition, rows), ...(audit.phraseAdditions || []).filter(a=>a.id===finding.id&&a.edition===edition).map(a=>a.ref)])];
      for (const ref of refs) {
        const comparison = byRef.get(ref)?.comparisons?.[key];
        if (!comparison) continue;
        const phrasePlan = audit.phrases?.[finding.id]?.[ref]?.[edition];
        // A reviewed context can include a neighboring, corrected passage. Never
        // paint it as defective just because the broad finding spans both rows.
        if (phrasePlan?.kind === 'anchor-mismatch') continue;
        const contextNote=(audit.phraseNoteCorrections || []).find(n=>n.id===finding.id&&n.previousNote===context.note)?.note || context.note;
        const quote = context[edition] || '';
        const exactQuote = quote && comparison.text?.replace(/\s+/g, ' ').includes(quote.replace(/\s+/g, ' '));
        const annotation = { id: finding.id, kind: finding.kind,
          category: finding.kind === 'PC' ? '' : (finding.categories || []).map(c => c.split('.').pop().replaceAll('_', ' ').replace(/\b\w/g, s => s.toUpperCase())).join(' · '),
          explanation: finding.description, contextNote,
          previewExplanation: edition === 'WH' ? finding.description : contextNote || finding.description,
          quote: exactQuote ? quote : comparison.text || quote,
          highlights: finding.kind === 'PC' ? [comparison.text || quote] : phrasePlan?.kind === 'omission' ? [] : phrasePlan ?? phraseHighlights(finding, context, edition),
          omission: phrasePlan?.kind === 'omission',
          japanese: (audit.phraseAdditions || []).some(a=>a.id===finding.id&&a.edition===edition&&a.ref===ref) ? byRef.get(ref).jaText : edition === 'WH' || finding.kind === 'PC' ? context.japanesePC : byRef.get(ref).jaText || context.japanesePS3,
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
    for (const member of row.members) for (const finding of member.comparisons?.['witch-hunt']?.findings || []) {
      const previous = findings.get(finding.id);
      findings.set(finding.id, previous ? {...previous, highlights:[...new Set([...(previous.highlights || []), ...(finding.highlights || [])])]} : finding);
    }
    row.comparisonGroup = { ...row.comparisonGroup, findings: [...findings.values()] };
  }
  return rows;
}
