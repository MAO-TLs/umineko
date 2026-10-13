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
function runSlice(runs, start, end) {
  const result = []; let offset = 0;
  for (const [text, styles] of runs) {
    const left = Math.max(start - offset, 0), right = Math.min(end - offset, text.length);
    if (right > left) result.push([text.slice(left, right), styles]);
    offset += text.length;
  }
  return result;
}
function auditText(document, cell, comparison, prefix) {
  const paragraph = make(document, 'p'); paragraph.lang = comparison.language || 'en';
  const fallbacks = make(document, 'div', 'todokanai-error-fallbacks');
  const notes = [], text = comparison.text || '';
  const runs = comparison.runs?.map(r => r[0]).join('') === text ? comparison.runs : [[text, []]];
  if (runs.some(r => r[1].includes('a:c'))) paragraph.classList.add('centered');
  const appendSlice = (parent, start, end) => {
    const styled = styledText(document, runSlice(runs, start, end), paragraph.lang);
    parent.append(...Array.from(styled.childNodes || styled.children));
  };
  let position = 0;
  for (const [i, finding] of (comparison.findings || []).entries()) {
    const id = prefix + '-finding-' + i, pc = finding.kind === 'PC';
    const label = pc ? 'Material added from original PC script' : finding.category || 'Translation audit';
    const trigger = make(document, 'button', 'todokanai-error-trigger' + (pc ? ' pc-material-trigger' : ''));
    trigger.type = 'button'; trigger.dataset.finding = id;
    if (finding.id) trigger.dataset.auditId = finding.id;
    trigger.setAttribute('aria-expanded', 'false'); trigger.setAttribute('aria-controls', id);
    const quote = finding.highlight || '';
    const offset = quote ? text.indexOf(quote, position) : -1;
    if (offset >= position) {
      appendSlice(paragraph, position, offset);
      appendSlice(trigger, offset, offset + quote.length); position = offset + quote.length;
      paragraph.append(trigger);
    } else {
      trigger.textContent = label; fallbacks.append(trigger);
    }
    const preview = make(document, 'span', 'todokanai-error-preview');
    preview.setAttribute('aria-hidden', 'true');
    preview.append(make(document, 'strong', '', label), make(document, 'span', '', finding.explanation));
    trigger.append(preview);
    const note = make(document, 'div', 'todokanai-error-note' + (pc ? ' pc-material-note' : '')); note.id = id; note.hidden = true;
    const header = make(document, 'header');
    const close = make(document, 'button', '', 'Close'); close.type = 'button'; close.dataset.closeFinding = id;
    header.append(make(document, 'span', 'todokanai-error-category', label), close);
    note.append(header, make(document, 'p', 'todokanai-error-explanation', finding.explanation));
    if (finding.contextNote && finding.contextNote !== finding.explanation) note.append(make(document, 'p', 'todokanai-error-explanation', finding.contextNote));
    if (finding.japanese) {
      note.append(make(document, 'strong', 'audit-source-label', finding.sourceLabel));
      const source = make(document, 'p', 'audit-source-text', finding.japanese); source.lang = 'ja'; note.append(source);
    }
    if (finding.sourceReading && finding.sourceReading !== finding.explanation && finding.sourceReading !== finding.contextNote) note.append(make(document, 'p', 'todokanai-error-explanation', finding.sourceReading));
    if (finding.href) { const link = make(document, 'a', 'audit-finding-link', 'View full audit finding →'); link.href = finding.href; note.append(link); }
    notes.push(note);
  }
  appendSlice(paragraph, position, text.length);
  cell.append(paragraph, fallbacks, ...notes);
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
      cell.append(styledText(document, Array.isArray(value) ? value : [[value || '—', []]], index === 0 ? 'ja' : 'en'));
      // Keep import/provenance details in the data, not under every passage.
      if (index === 0 && /provisional|uncertain/i.test(row.witness || '')) cell.append(make(document, 'small', 'witness', 'Transcription uncertain'));
    } else {
      const comparison = row.comparisons?.[column.key];
      if (!comparison) cell.append(make(document, 'p', 'comparison-missing', '—'));
      else if (showErrors.has(column.key) && comparison.findings?.length) {
        if (comparison.findings.some(f => f.kind !== 'PC')) { article.classList.add('script-line-error'); cell.classList.add('line-comparison-error'); } auditText(document, cell, comparison, row.ref + '-' + column.key);
      } else if (comparison.unavailableReason) cell.append(make(document, 'p', 'comparison-unavailable', ['intentionally-skipped','nontext-empty-slot'].includes(comparison.status) ? '—' : 'Not in this edition.'));
      else cell.append(comparison.runs ? styledText(document, comparison.runs, comparison.language || 'en') : make(document, 'p', '', comparison.text));
      if (comparison?.language === 'ja') cell.append(make(document, 'small', 'witness', 'Untranslated in WH'));
    }
    article.append(cell);
  });
  return article;
}
