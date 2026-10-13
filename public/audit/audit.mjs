import { COMPARISONS } from '../script/editions.mjs?v=audit-20261013-1';

const EDITION = { 'witch-hunt': 'WH', mangagamer: 'MG', 'umineko-project': 'UP' };
const PAGE_SIZE = 20;
const PC_LABEL = 'Material added from original PC script';
const FAMILY_LABELS = { linguistic: 'Linguistic', mystery: 'Mystery and reasoning', character: 'Character', world: 'World and continuity' };
export function auditKey(url) {
  const key = url.searchParams.get('script');
  return Object.hasOwn(COMPARISONS, key) ? key : 'witch-hunt';
}
export function readerLink(key, context, finding) {
  const p = new URLSearchParams({ edition: key === 'witch-hunt' ? 'pc' : 'ps3', compare: key });
  if (context?.chapter) p.set('script', context.chapter);
  const ref = context?.readerRefs ? context.readerRefs[EDITION[key]]?.[0] : context?.readerRef;
  if (finding) { p.set('errors', key); p.set('finding', finding); }
  return '../script/?' + p.toString() + (ref ? '#' + encodeURIComponent(ref) : '');
}
export function filterFindings(findings, state) {
  const normalized = s => String(s || '').normalize('NFKC').toLocaleLowerCase();
  const query = normalized(state.q).trim();
  return findings.filter(f => {
    if (state.view === 'pc' ? f.kind !== 'PC' : f.kind === 'PC') return false;
    if (!f.editions?.includes(EDITION[state.script])) return false;
    if (state.category && !f.categories?.includes(state.category)) return false;
    if (state.episode && !(f.contexts || []).some(c => String(c.episode) === state.episode)) return false;
    if (query && !normalized([f.id, f.description, f.sourceReading, f.alternative, ...(f.contexts || []).flatMap(c => [c.japanese, c.japanesePC, c.japanesePS3, c.WH, c.MG, c.UP, c.note])].filter(Boolean).join(' ')).includes(query)) return false;
    return true;
  });
}

if (typeof document !== 'undefined') {
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = String(text); return n; };
  const number = n => Number(n || 0).toLocaleString('en-US');
  let data, categories = new Map(), filtered = [], page = 1, timer;
  const select = $('audit-script');
  function state() {
    const url = new URL(location.href), p = url.searchParams;
    return { script: auditKey(url), view: p.get('view') === 'pc' ? 'pc' : 'findings', category: p.get('category') || '', episode: /^[1-8]$/.test(p.get('episode')) ? p.get('episode') : '', q: p.get('q') || '', page: Math.max(1, Number(p.get('page')) || 1) };
  }
  function selectedContexts(f, edition) {
    const contexts = f.contexts || [];
    // Separate original-PC and PS3 witnesses when an exporter supplies edition-specific contexts.
    return contexts.filter(c => !c.editions || c.editions.includes(edition));
  }
  function friendlyStatus(value) {
    if (typeof value === 'object' && value) return [friendlyStatus(value.status || value.disposition || ''), value.note || value.reason || value.explanation || ''].filter(Boolean).join(' — ');
    return String(value || '').replaceAll('_', ' ').replace(/\bWH\b/g, 'Witch Hunt');
  }
  function quote(label, text, japanese, translation) {
    const figure = el('figure', 'audit-quote' + (translation ? ' is-translation' : ''));
    figure.append(el('figcaption', '', label));
    const block = el('blockquote', text ? '' : 'audit-missing', text || 'No excerpt is recorded for this witness in this finding.');
    if (japanese && text) block.lang = 'ja';
    figure.append(block); return figure;
  }
  function contextCard(c, f, s) {
    const edition = EDITION[s.script], card = el('section', 'audit-context');
    const outcome = c.dispositions?.[edition];
    const neutral = ['correct', 'corrected', 'corrected_in_context', 'corrected_with_revised_wording', 'corrected_against_PS3_source_by_edition_change', 'corrected_comparatively', 'core_error_corrected', 'corrected_recurrence', 'rephrased_no_confirmed_retained_error', 'not_this_defect', 'acceptable', 'no_separate_defect_in_context', 'no_introduced_defect', 'source_edition_changed_not_applicable', 'not_applicable_edition_rewrite', 'follows_PS3', 'PS3_source_followed', 'PS3_wording'].includes(outcome);
    if (neutral) card.classList.add('is-corrected');
    const header = el('div', 'audit-context-heading');
    const readerRef = c.readerRefs ? c.readerRefs[edition]?.[0] : c.readerRef;
    const locationLabel = [c.episode ? 'Episode ' + c.episode : '', c.chapter || '', readerRef || ''].filter(Boolean).join(' · ');
    header.append(el('span', '', locationLabel || 'Source passage'));
    if (c.chapter && readerRef) {
      const a = el('a', '', 'Read in script context →'); a.href = readerLink(s.script, c, f.id); header.append(a);
    } else { header.append(el('span', '', 'Source excerpt · no verified reader anchor')); }
    card.append(header);
    const evidence = el('div', 'audit-evidence');
    const japanese = edition === 'WH' ? c.japanesePC ?? c.japanese : c.japanesePS3 ?? c.japanese;
    evidence.append(quote(edition === 'WH' ? 'Original PC Japanese' : 'PS3-derived Japanese', japanese, true, false), quote(COMPARISONS[s.script].label, c[edition], false, true));
    card.append(evidence);
    if (f.kind === 'PC' && c.japanesePC) {
      const original = el('details', 'audit-pc-source'); original.append(el('summary', '', 'Original-PC source for the retained material'), quote('Original PC Japanese', c.japanesePC, true, false)); card.append(original);
    }
    if (c.note) card.append(el('p', 'audit-context-note', c.note));
    const disposition = c.dispositions?.[edition];
    if (edition !== 'WH' && disposition && disposition !== 'not_recorded' && f.kind !== 'PC') {
      const p = el('p', 'audit-disposition'); p.append(el('b', '', COMPARISONS[s.script].label + ' at this occurrence: '), document.createTextNode(friendlyStatus(disposition))); card.append(p);
    }
    return card;
  }
  function findingCard(f, s, open) {
    const card = el('details', 'audit-finding' + (f.kind === 'PC' ? ' is-pc' : '')); card.id = f.id; card.open = open;
    const summary = el('summary'), meta = el('div', 'audit-finding-heading');
    meta.append(el('span', 'finding-kind', f.kind === 'PC' ? PC_LABEL : f.inherited && s.script !== 'witch-hunt' ? 'Carried over from Witch Hunt' : 'Confirmed finding'), el('span', '', f.id));
    if (f.severity && f.kind !== 'PC') meta.append(el('span', '', f.severity));
    summary.append(meta, el('h3', '', f.description)); card.append(summary);
    // Evidence is built on demand, keeping the complete corpus fast to browse.
    let built = false;
    function fill() {
      if (built || !card.open) return; built = true;
      const body = el('div', 'audit-finding-body');
      if (f.kind !== 'PC' && f.categories?.length) {
        const tags = el('div', 'audit-finding-meta');
        for (const id of f.categories) tags.append(el('span', 'audit-tag', categories.get(id)?.label || id));
        body.append(tags);
      }
      const link = el('a', 'audit-permalink', 'Permanent link to this finding #');
      const u = new URL(location.href); u.search = new URLSearchParams({ script: s.script, ...(f.kind === 'PC' ? { view: 'pc' } : {}) }).toString(); u.hash = f.id; link.href = u.pathname + u.search + u.hash; body.append(link);
      const contexts = selectedContexts(f, EDITION[s.script]);
      if (!contexts.length) body.append(el('p', 'audit-context-note', 'No source excerpt is included in this finding.'));
      for (const context of contexts) body.append(contextCard(context, f, s));
      const explanation = [['Source reading', f.sourceReading], ['Alternative reading considered', f.alternative], ['Source note', f.sourceNote]].filter(([, v]) => v);
      if (explanation.length) {
        const detail = el('details', 'audit-analysis'); detail.append(el('summary', '', 'Reading and correction notes'));
        const dl = el('dl'); for (const [k, v] of explanation) { const div = el('div'); div.append(el('dt', '', k), el('dd', '', v)); dl.append(div); } detail.append(dl); body.append(detail);
      }
      card.append(body);
    }
    card.addEventListener('toggle', fill); fill(); return card;
  }
  function render() {
    const s = state(), key = s.script, edition = EDITION[key]; select.value = key;
    for (const panel of document.querySelectorAll('[data-provenance]')) panel.hidden = panel.dataset.provenance !== key;
    $('audit-scope').textContent = COMPARISONS[key].label + ' · ' + (key === 'witch-hunt' ? 'Original PC' : 'PS3-derived') + ' source comparison';
    $('audit-reader-link').href = readerLink(key);
    document.title = COMPARISONS[key].label + ' Translation Audit | Umineko no Naku Koro ni | MAO — Preview';
    if (!data) return;
    const editionFindings = data.findings.filter(f => f.kind !== 'PC' && f.editions?.includes(edition));
    const inherited = editionFindings.filter(f => f.kind === 'WH' || f.inherited).length;
        $('audit-total').textContent = number(editionFindings.length);
    $('audit-inherited').textContent = number(edition === 'WH' ? 8 : inherited);
    $('audit-inherited-label').textContent = edition === 'WH' ? 'Episodes reviewed' : 'Carried over from Witch Hunt';
    $('audit-added').textContent = number(edition === 'WH' ? data.summary.pcNotes : editionFindings.length - inherited);
    $('audit-added-label').textContent = edition === 'WH' ? 'PC-material notes across MG / UP' : 'Additional findings';
    $('audit-method').textContent = edition === 'WH' ? 'Every listed Witch Hunt finding is judged against the original-PC Japanese. MangaGamer and Umineko Project have their own findings and independent judgments in the selector above.' : 'This total includes ' + number(inherited) + ' Witch Hunt findings that remain defective in ' + COMPARISONS[key].label + ', plus ' + number(editionFindings.length - inherited) + ' additional findings. Corrected Witch Hunt errors and yellow PC-material notes are excluded.';
    $('audit-view').value = s.view; $('audit-category').value = s.category; $('audit-category').disabled = s.view === 'pc'; $('audit-episode').value = s.episode; $('audit-query').value = s.q;
    filtered = filterFindings(data.findings, s);
    let hash = ''; try { hash = decodeURIComponent(location.hash.slice(1)); } catch {}
    const anchorIndex = filtered.findIndex(f => f.id === hash);
    page = anchorIndex >= 0 ? Math.floor(anchorIndex / PAGE_SIZE) + 1 : Math.min(Math.ceil(filtered.length / PAGE_SIZE) || 1, Math.floor(s.page));
    const offset = (page - 1) * PAGE_SIZE, visible = filtered.slice(offset, offset + PAGE_SIZE);
    const list = $('audit-findings'); list.replaceChildren(); list.setAttribute('aria-busy', 'false');
    for (const f of visible) list.append(findingCard(f, s, f.id === hash));
    if (!visible.length) list.append(el('p', 'audit-empty', s.view === 'pc' && edition === 'WH' ? 'PC-material notes concern the MangaGamer and Umineko Project adaptations. Select either translation above to view its retained PC material.' : 'No ' + (s.view === 'pc' ? 'PC-material notes' : 'findings') + ' match these filters.'));
    $('audit-status').textContent = number(filtered.length) + (s.view === 'pc' ? (filtered.length === 1 ? ' PC-material note' : ' PC-material notes') : (filtered.length === 1 ? ' finding' : ' findings')) + (visible.length ? ' · Showing ' + number(offset + 1) + '–' + number(offset + visible.length) : '');
    $('audit-view-note').textContent = s.view === 'pc' ? 'Yellow source-edition annotations · Excluded from error totals' : 'Each finding counts once in this translation.';
    $('audit-page-status').textContent = 'Page ' + page + ' of ' + (Math.ceil(filtered.length / PAGE_SIZE) || 1);
    $('audit-previous').disabled = page <= 1; $('audit-next').disabled = offset + PAGE_SIZE >= filtered.length;
    if (anchorIndex >= 0) requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ block: 'start' }));
  }
  function navigate(patch, replace = false, scroll = false) {
    const url = new URL(location.href); url.hash = '';
    for (const [k, v] of Object.entries(patch)) { if (v) url.searchParams.set(k, v); else url.searchParams.delete(k); }
    if (!Object.hasOwn(patch, 'page')) url.searchParams.delete('page');
    history[replace ? 'replaceState' : 'pushState'](null, '', url); render();
    if (scroll) $('audit-filters').scrollIntoView({ block: 'start' });
  }
  select.addEventListener('change', () => navigate({ script: select.value }));
  select.form.addEventListener('submit', e => { e.preventDefault(); navigate({ script: select.value }); });
  $('audit-filters').addEventListener('submit', e => { e.preventDefault(); clearTimeout(timer); navigate({ q: $('audit-query').value }); });
  $('audit-view').addEventListener('change', () => navigate({ view: $('audit-view').value === 'pc' ? 'pc' : '', category: '' }));
  $('audit-category').addEventListener('change', () => navigate({ category: $('audit-category').value }));
  $('audit-episode').addEventListener('change', () => navigate({ episode: $('audit-episode').value }));
  $('audit-query').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => navigate({ q: $('audit-query').value }, true), 200); });
  $('audit-reset').addEventListener('click', () => navigate({ q: '', category: '', episode: '', view: '' }));
  $('audit-previous').addEventListener('click', () => navigate({ page: String(page - 1) }, false, true));
  $('audit-next').addEventListener('click', () => navigate({ page: String(page + 1) }, false, true));
  window.addEventListener('popstate', render); window.addEventListener('hashchange', render);
  render();
  fetch('../data/audit/index.json').then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(payload => {
    data = payload; categories = new Map(data.categories.map(c => [c.id, c]));
    const families = new Map();
    for (const c of data.categories) { const family = c.family || 'Other categories'; if (!families.has(family)) families.set(family, []); families.get(family).push(c); }
    for (const [family, items] of families) { const group = el('optgroup'); group.label = FAMILY_LABELS[family] || family; for (const c of items) { const option = el('option', '', c.label); option.value = c.id; group.append(option); } $('audit-category').append(group); }
    for (let n = 1; n <= 8; n++) { const option = el('option', '', 'Episode ' + n); option.value = String(n); $('audit-episode').append(option); }
    render();
  }).catch(error => {
    $('audit-findings').setAttribute('aria-busy', 'false'); $('audit-status').textContent = 'The audit data could not be loaded. Reload this page to try again.'; console.error(error);
  });
}
