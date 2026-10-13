import { EDITIONS, COMPARISONS, readState, columnsFor, stateURL, matches } from './editions.mjs?v=audit-20261013-1';
import { renderPassage } from './passage.mjs?v=audit-20261013-1';
import { groupPassages } from './groups.mjs?v=audit-20261013-1';
import { annotateRows, annotateGroups } from './audit.mjs?v=audit-20261013-1';
const $ = id => document.getElementById(id);
const el = (tag, cls = '', text) => { const n = document.createElement(tag); n.className = cls; if (text !== undefined) n.textContent = text; return n; };
const cache = new Map();
let index, state, serial = 0, timer, limit = 100, lastHits = [], activeFinding = '';
async function json(path) {
  const response = await fetch(path);
  if (!response.ok) throw Error('Could not load the script (' + response.status + ').');
  return response.json();
}
function cached(path) {
  if (!cache.has(path)) cache.set(path, json('../data/' + path + '.json').catch(error => { cache.delete(path); throw error; }));
  return cache.get(path);
}
async function load(chapter, edition, compare = state.compare, errors = state.errors) {
  const keys = columnsFor({ script: edition, compare }).slice(2).map(c => c.key);
  const [data, ...texts] = await Promise.all([cached(edition + '/' + chapter), ...keys.map(k => cached('comparisons/' + k + '/' + chapter))]);
  const rows = data.rows.map(row => ({ ...row, comparisons: Object.fromEntries(keys.map((k, i) => [k, texts[i].rows[row.ref] ? { ...texts[i].rows[row.ref] } : undefined])) }));
  let auditError = false;
  if (keys.some(k => errors.includes(k))) {
    try { annotateRows(rows, await cached('audit/chapters/' + chapter), chapter, keys.filter(k => errors.includes(k))); }
    catch { auditError = true; }
  }
  return { ...data, auditError, sourceCount: rows.length, rows: annotateGroups(groupPassages(rows, texts[keys.indexOf('witch-hunt')]?.groups)) };
}
const reference = () => { try { return decodeURIComponent(location.hash.slice(1)); } catch { return ''; } };
function passageURL(ref, chapter = state.chapter) {
  const meta = index.scripts.find(s => s.id === chapter);
  return stateURL(location.href, { ...state, chapter, section: meta.episode, q: '', finding: '', scope: 'script', filter: 'all' }, ref).href;
}
function rowNode(row, chapter = state.chapter) {
  return renderPassage(document, row, state, new Set(state.errors), ref => passageURL(ref, chapter));
}
function target(ref) {
  if (state.finding) {
    const passage = document.getElementById(ref);
    const context = passage?.closest('.script-passage-group') || passage;
    const scoped = context ? [...context.querySelectorAll('[data-audit-id]')] : [];
    const button = scoped.find(b => b.dataset.auditId === state.finding) || [...document.querySelectorAll('[data-audit-id]')].find(b => b.dataset.auditId === state.finding);
    if (button) { closeFinding(); activeFinding = button.dataset.finding; button.setAttribute('aria-expanded', 'true'); document.getElementById(activeFinding).hidden = false; button.scrollIntoView({ block: 'center' }); button.focus({ preventScroll: true }); return; }
  }
  if (!ref || ref === 'reader-controls') return;
  document.querySelectorAll('.script-line-target').forEach(n => n.classList.remove('script-line-target'));
  let node = document.getElementById(ref);
  if (!node) {
    const line = Number(ref.match(/-L(\d+)$/)?.[1]);
    if (line) node = [...$('script-results').querySelectorAll('article.script-line')].find(n => Number(n.dataset.start) <= line && line <= Number(n.dataset.end));
  }
  if (node) { node.classList.add('script-line-target'); node.scrollIntoView({ block: 'center' }); node.focus({ preventScroll: true }); }
}
function closeFinding(focus = false) {
  if (!activeFinding) return;
  const button = [...document.querySelectorAll('[data-finding]')].find(b => b.dataset.finding === activeFinding);
  const note = document.getElementById(activeFinding);
  if (note) note.hidden = true;
  if (button) { button.setAttribute('aria-expanded', 'false'); if (focus) button.focus({ preventScroll: true }); }
  activeFinding = '';
}
function findingURL(id, ref = reference()) {
  state.finding = id; history.replaceState(null, '', stateURL(location.href, state, ref));
}
document.addEventListener('keydown', event => { if (event.key === 'Escape' && activeFinding) { closeFinding(true); findingURL(''); } });
document.addEventListener('click', event => {
  const button = event.target.closest('[data-finding]');
  if (button) {
    const id = button.dataset.finding, opening = activeFinding !== id;
    closeFinding();
    if (opening) {
      activeFinding = id; button.setAttribute('aria-expanded', 'true'); document.getElementById(id).hidden = false;
      const passage = button.closest('article.script-line') || button.closest('.script-passage-group')?.querySelector('article.script-line');
      findingURL(button.dataset.auditId || '', passage?.id || reference());
    } else findingURL('');
  } else if (event.target.closest('[data-close-finding]')) { closeFinding(true); findingURL(''); }
});
function checkbox(label, checked, onChange, cls = 'comparison-toggle') {
  const wrapper = el('label', cls), input = el('input'); input.type = 'checkbox'; input.checked = checked;
  input.addEventListener('change', () => onChange(input.checked));
  wrapper.append(input, el('span', '', label)); return wrapper;
}
function controls() {
  const meta = index.scripts.find(s => s.id === state.chapter);
  $('episode').replaceChildren(...index.episodes.map((name, i) => {
    const o = el('option', '', 'Episode ' + (i + 1) + ' · ' + name); o.value = i + 1; return o;
  }));
  $('episode').value = state.section; $('episode').disabled = false;
  const chapters = index.scripts.filter(s => s.episode === state.section);
  $('scene').replaceChildren(...chapters.map(s => {
    const o = el('option', '', s.title + ' · ' + s.rows[state.script].toLocaleString() + ' passages'); o.value = s.id; return o;
  }));
  $('scene').value = meta.id; $('scene').disabled = false;
  const n = index.scripts.indexOf(meta);
  $('previous').disabled = n === 0; $('next').disabled = n === index.scripts.length - 1;
  document.querySelectorAll('[name="edition"]').forEach(n => { n.checked = n.value === state.script; });
  document.querySelectorAll('[name="scope"]').forEach(n => { n.checked = n.value === state.scope; });
  $('search').disabled = false; $('search').value = state.q;
  $('search-label').textContent = state.scope === 'corpus' ? 'Search all ' + index.totals[state.script].toLocaleString() + ' passages' : 'Search this script';
  const selected = columnsFor(state).slice(2).map(c => c.key);
  const fragment = document.createDocumentFragment();
  for (const key of EDITIONS[state.script].comparisons) {
    const label = COMPARISONS[key].label;
    const toggle = checkbox('Display ' + label + ' for comparison', selected.includes(key), checked => {
      const set = new Set(selected); checked ? set.add(key) : set.delete(key);
      navigate({ compare: set.size === 2 ? 'both' : [...set][0] || 'none', errors: state.errors.filter(k => set.has(k)) }, { ref: reference() });
    });
    toggle.append(el('small', '', key === 'mangagamer' ? 'MangaGamer-based UP adaptation' : key === 'witch-hunt' ? 'Original PC fan patch · no native name tags' : 'Umineko Project English')); fragment.append(toggle);
    if (selected.includes(key)) {
      const row = el('div', 'comparison-errors-row');
      row.append(checkbox('Display ' + label + ' audit notes', state.errors.includes(key), checked => {
        const set = new Set(state.errors); checked ? set.add(key) : set.delete(key);
        navigate({ errors: [...set] }, { ref: reference() });
      }, 'comparison-toggle comparison-toggle-errors'), el('small', 'comparison-errors-status', 'Red: translation findings · Yellow: PC material'));
      fragment.append(row);
    }
  }
  $('comparison-controls').replaceChildren(fragment);
}
function renderHits() {
  const hits = lastHits.filter(h => state.filter === 'all' || h.meta.episode === Number(state.filter));
  $('script-title').textContent = 'Search results'; $('script-position').textContent = hits.length.toLocaleString() + ' matches';
  $('edition-status').textContent = hits.length.toLocaleString() + ' matching passages';
  $('script-results').className = 'concordance-results';
  const fragment = document.createDocumentFragment();
  for (const { meta, row } of hits.slice(0, limit)) {
    const hit = el('article', 'concordance-hit'), link = el('a', 'concordance-hit-link');
    link.href = passageURL(row.ref, meta.id);
    link.append(el('span', '', meta.label), el('code', '', row.ref), el('strong', '', 'Open in context →'));
    hit.append(link, rowNode(row, meta.id)); fragment.append(hit);
  }
  if (!hits.length) fragment.append(el('p', 'script-status', 'No passages match this search.'));
  $('script-results').replaceChildren(fragment);
  $('more').hidden = hits.length <= limit;
  $('more').textContent = 'Show more results (' + Math.max(0, hits.length - limit).toLocaleString() + ' remaining)';
  $('episode-filters').hidden = false;
  $('episode-filters').replaceChildren(...[['all', 'All episodes'], ...index.episodes.map((name, i) => [String(i + 1), 'Episode ' + (i + 1)])].map(([id, label]) => {
    const button = el('button', id === state.filter ? 'is-active' : '', label); button.type = 'button';
    button.setAttribute('aria-pressed', String(id === state.filter));
    button.append(el('span', '', String(id === 'all' ? lastHits.length : lastHits.filter(h => h.meta.episode === Number(id)).length)));
    button.onclick = () => { state.filter = id; limit = 100; history.pushState(null, '', stateURL(location.href, state)); renderHits(); };
    return button;
  }));
}
async function render(ref = '') {
  const request = ++serial, snapshot = { ...state }, meta = index.scripts.find(s => s.id === state.chapter);
  closeFinding(); $('more').hidden = true; $('episode-filters').hidden = true;
  $('script-results').setAttribute('aria-busy', 'true');
  $('script-results').className = 'script-lines';
  $('script-results').replaceChildren(el('p', 'script-status', 'Loading…'));
  $('edition-status').textContent = 'Loading…';
  try {
    if (snapshot.scope === 'corpus') {
      $('script-title').textContent = 'Search all episodes'; $('script-position').textContent = '';
      if (!snapshot.q.trim()) {
        $('script-results').className = 'concordance-prompt';
        const heading = el('h2', '', 'Search the complete script');
        $('script-results').replaceChildren(heading, el('p', '', 'Enter an English or Japanese phrase, or a character’s name, to search all eight episodes.'));
        $('edition-status').textContent = index.totals[state.script].toLocaleString() + ' passages · 163 scripts';
      } else {
        const hits = [];
        for (let start = 0; start < index.scripts.length; start += 8) {
          const batch = index.scripts.slice(start, start + 8);
          const loaded = await Promise.all(batch.map(m => load(m.id, snapshot.script, snapshot.compare, snapshot.errors)));
          if (request !== serial) return;
          loaded.forEach((d, i) => d.rows.forEach(row => { if (matches(row, snapshot.q)) hits.push({ meta: batch[i], row }); }));
          $('edition-status').textContent = 'Searching ' + Math.min(start + 8, index.scripts.length) + '/163 scripts…';
        }
        lastHits = hits; renderHits();
      }
    } else {
      const data = await load(meta.id, snapshot.script, snapshot.compare, snapshot.errors);
      if (request !== serial) return;
      const rows = data.rows.filter(r => matches(r, snapshot.q));
      if (data.auditError) document.querySelectorAll('.comparison-errors-status').forEach(n => { n.textContent = 'Audit notes could not be loaded'; });
      $('script-title').textContent = meta.label;
      $('script-position').textContent = data.sourceCount.toLocaleString() + ' source passages';
      const count = rows.reduce((sum,row) => sum + (row.members ? row.members.filter(member => matches(member,snapshot.q)).length : 1),0);
      $('edition-status').textContent = count.toLocaleString() + (snapshot.q ? ' matching' : '') + (count === 1 ? ' passage' : ' passages');
      $('script-results').replaceChildren(...rows.map(r => rowNode(r)));
      if (!rows.length) $('script-results').append(el('p', 'script-status', 'No passages match this search.'));
    }
    if (request === serial) requestAnimationFrame(() => target(ref));
  } catch (error) {
    if (request !== serial) return;
    $('edition-status').textContent = 'Could not load';
    const retry = el('button', 'back-to-controls', 'Retry'); retry.onclick = () => render(ref);
    $('script-results').replaceChildren(el('p', 'script-status', error.message), retry);
  } finally { if (request === serial) $('script-results').setAttribute('aria-busy', 'false'); }
}
function navigate(changes, { replace = false, ref = '' } = {}) {
  if (changes.chapter && changes.chapter !== state.chapter || changes.script && changes.script !== state.script || changes.compare && changes.compare !== state.compare) changes.finding = '';
  clearTimeout(timer); state = { ...state, ...changes }; limit = 100;
  history[replace ? 'replaceState' : 'pushState'](null, '', stateURL(location.href, state, ref));
  controls(); render(ref);
}
function chapterChange(chapter) {
  const meta = index.scripts.find(s => s.id === chapter);
  navigate({ chapter, section: meta.episode, q: '', scope: 'script', filter: 'all' });
}
$('episode').onchange = () => chapterChange(index.scripts.find(s => s.episode === Number($('episode').value)).id);
$('scene').onchange = () => chapterChange($('scene').value);
for (const [id, delta] of [['previous', -1], ['next', 1]]) $(id).onclick = () => {
  const next = index.scripts[index.scripts.findIndex(s => s.id === state.chapter) + delta]; if (next) chapterChange(next.id);
};
document.querySelectorAll('[name="edition"]').forEach(input => input.onchange = () => {
  if (!index) return;
  // Common chapter positions remain meaningful; incompatible comparators never cross editions.
  navigate({ script: input.value, compare: 'none', errors: [], filter: 'all' }, { ref: reference() });
});
document.querySelectorAll('[name="scope"]').forEach(input => input.onchange = () => { if (index) navigate({ scope: input.value, filter: 'all' }); });
$('search').oninput = () => {
  clearTimeout(timer); ++serial; // Immediately cancel a stale asynchronous corpus search.
  const q = $('search').value;
  timer = setTimeout(() => navigate({ q, filter: 'all' }, { replace: true }), 180);
};
$('more').onclick = () => { limit += 100; renderHits(); };
document.querySelector('.back-to-controls').onclick = event => {
  event.preventDefault(); $('reader-controls').scrollIntoView({ behavior: 'auto', block: 'start' }); $('episode').focus({ preventScroll: true });
};
function restore() {
  if (!index) return;
  clearTimeout(timer); state = readState(new URL(location.href), index);
  controls(); render(reference());
}
window.addEventListener('popstate', restore);
window.addEventListener('hashchange', () => target(reference()));
json('../data/index.json').then(data => {
  index = data; state = readState(new URL(location.href), index);
  history.replaceState(null, '', stateURL(location.href, state, reference()));
  controls(); render(reference());
}).catch(error => {
  $('edition-status').textContent = error.message;
  const retry = el('button', 'back-to-controls', 'Reload reader'); retry.onclick = () => location.reload();
  $('script-results').replaceChildren(retry); $('script-results').setAttribute('aria-busy', 'false');
});
