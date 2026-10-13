import { columnsFor } from './editions.mjs?v=audit-20261013-1';
const make = (document, tag, className = '', text) => {
  const node = document.createElement(tag); node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
export function styledText(document, runs, lang) {
  const p = make(document, 'p'); p.lang = lang;
  for (const [text, styles] of runs) {
    let node = document.createTextNode(text);
    for (const style of styles) {
      if (!['i', 'red', 'blue', 'gold', 'purple', 'a:c'].includes(style)) continue;
      const wrapper = make(document, style === 'i' ? 'em' : 'span', style === 'i' ? '' : style === 'a:c' ? 'centered' : 'truth-' + style);
      wrapper.append(node); node = wrapper;
    }
    p.append(node);
  }
  if (runs.some(r => r[1].includes('a:c'))) p.classList.add('centered');
  return p;
}
export function trimRuns(runs) {
  const text = runs.map(r => r[0]).join('');
  return runSlice(runs, text.length - text.trimStart().length, text.trimEnd().length);
}
function runSlice(runs, start, end) {
  const result = []; let offset = 0;
  for (const [text, styles] of runs) {
    const left = Math.max(start - offset, 0), right = Math.min(end - offset, text.length);
    if (right > left) result.push([text.slice(left, right), styles]);
    offset += text.length;
  }
  return result;
}
export function auditRange(text, quote) {
  const normalized = value => value.replace(/\s+/gu, ' ').trim();
  if (!quote || !normalized(quote)) return null;
  const offsets = [], letters = [];
  for (let i = 0; i < text.length; i++) {
    if (/\s/u.test(text[i]) && letters.at(-1) === ' ') continue;
    letters.push(/\s/u.test(text[i]) ? ' ' : text[i]); offsets.push(i);
  }
  const needle = normalized(quote), haystack = letters.join('');
  const start = haystack.indexOf(needle);
  if (start >= 0) return {start: offsets[start], end: offsets[start + needle.length - 1] + 1};
  return null;
}
function auditText(document, cell, comparison, prefix, contextHref, translationLabel) {
  const paragraph = make(document, 'p', 'todokanai-annotated-text'); paragraph.lang = comparison.language || 'en';
  const fallbacks = make(document, 'div', 'todokanai-error-fallbacks');
  const notes = [], original = comparison.text || '';
  const runs = trimRuns(comparison.runs?.map(r => r[0]).join('') === original ? comparison.runs : [[original, []]]);
  const text = runs.map(r => r[0]).join('');
  if (runs.some(r => r[1].includes('a:c'))) paragraph.classList.add('centered');
  const appendSlice = (parent, start, end) => {
    const styled = styledText(document, runSlice(runs, start, end), paragraph.lang);
    parent.append(...Array.from(styled.childNodes || styled.children));
  };
  let position = 0;
  const findings = (comparison.findings || []).flatMap((finding, i) => {
    const ranges = (finding.highlights ?? [finding.highlight]).map(quote => auditRange(text, quote)).filter(Boolean);
    return (ranges.length ? ranges : [null]).map((range, span) => ({finding, i, span, range}));
  })
    .sort((a, b) => (a.range?.start ?? Infinity) - (b.range?.start ?? Infinity) || (b.range?.end ?? 0) - (a.range?.end ?? 0));
  // Shared faulty words can support more than one finding. Cover the entire
  // overlap once, while keeping every individual note available beside it.
  let previous;
  for (const item of findings.filter(item=>item.range && item.finding.kind !== 'PC')) {
    if (previous && item.range.start < previous.range.end) {
      previous.range.end = Math.max(previous.range.end, item.range.end);
      previous.related ||= [previous.finding]; previous.related.push(item.finding);
      item.range = null;
    } else previous = item;
  }
  for (const item of findings.filter(item=>item.range && item.finding.kind === 'PC')) {
    if (findings.some(other=>other.range && other.finding.kind !== 'PC' && item.range.start < other.range.end && other.range.start < item.range.end)) item.range = null;
  }
  for (const {finding, i, span, range, related} of findings) {
    const id = prefix + '-finding-' + i + '-span-' + span, pc = finding.kind === 'PC';
    const label = pc ? 'Material added from original PC script' : finding.category || 'Translation audit';
    const trigger = make(document, 'button', 'todokanai-error-trigger' + (pc ? ' pc-material-trigger' : ''));
    trigger.type = 'button'; trigger.dataset.finding = id;
    if (finding.id) trigger.dataset.auditId = finding.id;
    trigger.setAttribute('aria-expanded', 'false'); trigger.setAttribute('aria-controls', id);
    if (range && range.start >= position) {
      trigger.setAttribute('aria-label', text.slice(range.start, range.end));
      appendSlice(paragraph, position, range.start);
      appendSlice(trigger, range.start, range.end); position = range.end;
      paragraph.append(trigger);
    } else {
      trigger.className = pc ? 'pc-material-trigger' : '';
      trigger.textContent = finding.omission ? 'View omitted text note' : 'View ' + label.toLowerCase() + ' note'; fallbacks.append(trigger);
      trigger.setAttribute('aria-label', trigger.textContent);
    }
    const preview = make(document, 'span', 'todokanai-error-preview');
    preview.id = id + '-preview'; preview.setAttribute('role', 'tooltip');
    trigger.setAttribute('aria-describedby', preview.id);
    for (const explanation of related || [finding]) preview.append(make(document, 'strong', '', explanation.category || label), make(document, 'span', '', explanation.previewExplanation || explanation.explanation));
    trigger.append(preview);
    const note = make(document, 'aside', 'todokanai-error-note' + (pc ? ' pc-material-note' : '')); note.id = id; note.hidden = true;
    note.setAttribute('aria-label', 'Audit note ' + (finding.id || ''));
    const header = make(document, 'header');
    const close = make(document, 'button', '', 'Close'); close.type = 'button'; close.dataset.closeFinding = id;
    close.setAttribute('aria-label', 'Close error note');
    const heading = make(document, 'div');
    heading.append(make(document, 'span', 'todokanai-error-category', label), make(document, 'span', 'todokanai-error-severity', pc ? 'Source edition' : 'Confirmed'));
    header.append(heading, close); note.append(header, make(document, 'code', '', finding.id || ''));
    for (const [label, value, lang] of [[finding.sourceLabel || 'Japanese', finding.japanese, 'ja'], [translationLabel, finding.quote || finding.highlight, 'en'], ['Governing reading', finding.sourceReading, 'en']]) {
      if (!value) continue;
      const evidence = make(document, 'div', 'todokanai-error-evidence'), p = make(document, 'p', '', value); p.lang = lang;
      evidence.append(make(document, 'span', '', label), p); note.append(evidence);
    }
    note.append(make(document, 'p', 'todokanai-error-explanation', finding.explanation));
    if (finding.contextNote && finding.contextNote !== finding.explanation) note.append(make(document, 'p', 'todokanai-error-explanation', finding.contextNote));
    const actions = make(document, 'div', 'todokanai-error-actions');
    const context = make(document, 'a', '', 'Open this passage in context →'); context.href = contextHref; actions.append(context);
    if (finding.href) { const link = make(document, 'a', '', 'Open related audit finding →'); link.href = finding.href; actions.append(link); }
    note.append(actions);
    notes.push(note);
  }
  appendSlice(paragraph, position, text.length);
  cell.append(paragraph);
  if (fallbacks.children.length) cell.append(fallbacks);
  cell.append(...notes);
}
export function renderPassage(document, row, state, showErrors = new Set(), href = ref => '#' + encodeURIComponent(ref)) {
  if (row.members && state.script === 'pc' && state.compare === 'witch-hunt') {
    const group = make(document, 'div', 'script-passage-group');
    const sources = make(document, 'div', 'group-source-passages');
    for (const member of row.members) sources.append(renderPassage(document, member, { ...state, compare: 'none' }, showErrors, href));
    const display = { ...row, members: undefined, comparisons: { 'witch-hunt': row.comparisonGroup } };
    const comparison = [...renderPassage(document, display, state, showErrors, href).children].find(cell => cell.dataset.corpus === 'witch-hunt');
    group.append(sources, comparison);
    return group;
  }
  const columns = columnsFor(state);
  const article = make(document, 'article', 'script-line' + (columns.length > 2 ? ' script-line-comparison' : ''));
  article.id = row.ref; article.tabIndex = -1;
  article.dataset.start = row.start || ''; article.dataset.end = row.end || '';
  article.style.setProperty('--cell-count', columns.length);
  if (row.path?.length) {
    const note = make(document, 'div', 'path-note');
    row.path.forEach((path, i) => {
      if (i) note.append(document.createElement('br'));
      if (typeof path === 'string') note.append(document.createTextNode(path));
      else {
        note.append(document.createTextNode(path.label + ' '));
        const link = make(document, 'a', '', 'line ' + path.jump);
        link.href = href(row.ref.split('-')[0] + '-L' + String(path.jump).padStart(4, '0')); note.append(link);
      }
    }); article.append(note);
  }
  const label = row.label || (row.start ? row.start + (row.end !== row.start ? '–' + row.end : '') : row.kind === 'quiz' ? 'Q' : row.kind === 'media' ? '•' : 'PC');
  const ref = make(document, 'a', 'line-ref', label); ref.href = href(row.ref);
  ref.setAttribute('aria-label', 'Link to passage ' + row.ref); article.append(ref);
  columns.forEach((column, index) => {
    const cell = make(document, 'div', 'line-cell ' + (index === 0 ? 'line-ja' : 'line-en') + (index > 1 ? ' line-todokanai' : ''));
    cell.dataset.corpus = column.key;
    const heading = make(document, 'div', 'line-cell-heading');
    heading.append(make(document, 'span', 'speaker' + (index === 0 ? ' speaker-ja' : ''), index === 0 ? row.speakerJa || '' : index === 1 ? row.speaker || '' : row.comparisons?.[column.key]?.speaker || ''));
    if (columns.length > 2) heading.append(make(document, 'span', 'edition-label', column.label));
    cell.append(heading);
    if (index < 2) {
      const value = index === 0 ? row.ja : row.en;
      cell.append(styledText(document, trimRuns(Array.isArray(value) ? value : [[value || '—', []]]), index === 0 ? 'ja' : 'en'));
      // Keep import/provenance details in the data, not under every passage.
      if (index === 0 && /provisional|uncertain/i.test(row.witness || '')) cell.append(make(document, 'small', 'witness', 'Transcription uncertain'));
    } else {
      const comparison = row.comparisons?.[column.key];
      if (!comparison) cell.append(make(document, 'p', 'comparison-missing', '—'));
      else if (showErrors.has(column.key) && comparison.findings?.length) {
        if (comparison.findings.some(f => f.kind !== 'PC')) { article.classList.add('script-line-error'); cell.classList.add('line-comparison-error'); } auditText(document, cell, comparison, row.ref + '-' + column.key, href(row.ref), column.label);
      } else if (comparison.unavailableReason) cell.append(make(document, 'p', 'comparison-unavailable', ['intentionally-skipped','nontext-empty-slot'].includes(comparison.status) ? '—' : 'Not in this edition.'));
      else cell.append(styledText(document, trimRuns(comparison.runs || [[comparison.text || '', []]]), comparison.language || 'en'));
      if (comparison?.language === 'ja') cell.append(make(document, 'small', 'witness', 'Untranslated in WH'));
    }
    article.append(cell);
  });
  return article;
}
