// Refine presentation links only; retained audit records and judgments are intact.
export function applyPhraseExclusions(data) {
  const byId=new Map(data.findings.map(f=>[f.id,f]));
  for(const {id,contextIndex,edition,ref} of data.phraseExclusions || []) {
    const context=byId.get(id)?.contexts[contextIndex];
    if(context?.findingRefs?.[edition]) context.findingRefs[edition]=context.findingRefs[edition].filter(r=>r!==ref);
  }
  for(const {id,contextIndex,edition,ref,replace} of data.phraseAdditions || []) {
    const context=byId.get(id)?.contexts[contextIndex];
    if(context) {
      context.findingRefs ||= {};
      context.findingRefs[edition]=replace?[ref]:[...new Set([...(context.findingRefs[edition]||[]),ref])];
    }
  }
  for(const {id,contextIndex,note} of data.phraseNoteCorrections || []) {
    const context=byId.get(id)?.contexts[contextIndex];if(context)context.note=note;
  }
  for(const {id,contextIndex,edition,japanese,translation} of data.phraseEvidence || []) {
    const context=byId.get(id)?.contexts[contextIndex];
    if(context){context.findingEvidence ||= {};context.findingEvidence[edition]={japanese,translation};}
  }
  return data;
}
