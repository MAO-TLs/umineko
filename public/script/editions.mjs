// Edition selects matching own texts, never a fallback from the other edition.
import { matchesReaderText } from './reader-search.mjs';
export const EDITIONS = {
  pc: { label: 'PC', japanese: 'pc-ja', mao: 'mao-pc', comparisons: ['witch-hunt'] },
  ps3: { label: 'PS3', japanese: 'ps3-ja', mao: 'mao-ps3', comparisons: ['umineko-project', 'mangagamer'] },
};
export const COMPARISONS = {
  'witch-hunt': { label: 'Witch Hunt', audit: '../audit/?script=witch-hunt' },
  'umineko-project': { label: 'Umineko Project', audit: '../audit/?script=umineko-project' },
  mangagamer: { label: 'MangaGamer', audit: '../audit/?script=mangagamer' },
};
export function comparisonOptions(edition) {
  return ['none', ...EDITIONS[edition].comparisons, ...(edition === 'ps3' ? ['both'] : [])];
}
export function syncReaderSelections(root, state) {
  for (const [name, value] of [['edition', state.script], ['scope', state.scope]]) {
    for (const input of root.querySelectorAll('input[name="' + name + '"]')) {
      const selected = input.value === value;
      input.defaultChecked = selected;
      input.checked = selected;
    }
  }
}
export function normalizeState(edition, compare) {
  const script = Object.hasOwn(EDITIONS, edition) ? edition : 'pc';
  return { script, compare: comparisonOptions(script).includes(compare) ? compare : 'none' };
}
export function columnsFor(state) {
  const { script, compare } = normalizeState(state.script, state.compare);
  const edition = EDITIONS[script];
  const comparisons = compare === 'none' ? [] : compare === 'both' ? edition.comparisons : [compare];
  return [
    { key: edition.japanese, label: 'Japanese' },
    { key: edition.mao, label: 'MAO English' },
    ...comparisons.map(key => ({ key, ...COMPARISONS[key] })),
  ];
}
export function readState(url, index) {
  const p = url.searchParams;
  // Accept the early preview's ?script=pc|ps3 and the source reader's ?chapter=.
  const legacyEdition = ['pc', 'ps3'].includes(p.get('script')) ? p.get('script') : null;
  const base = normalizeState(p.get('edition') || legacyEdition, p.get('compare'));
  const section = Number(p.get('section') || p.get('episode'));
  const wanted = legacyEdition ? p.get('scene') || p.get('chapter') : p.get('script') || p.get('chapter');
  const chapter = index.scripts.find(s => s.id === wanted)
    || index.scripts.find(s => s.episode === section) || index.scripts[0];
  const selected = columnsFor(base).slice(2).map(c => c.key);
  return { ...base, chapter: chapter.id, section: chapter.episode,
    scope: ['corpus', 'all'].includes(p.get('scope')) ? 'corpus' : 'script',
    q: p.get('q') || '', finding: p.get('finding') || '', filter: /^[1-8]$/.test(p.get('filter')) ? p.get('filter') : 'all',
    errors: (p.get('errors') || '').split(',').filter(k => selected.includes(k)) };
}
export function stateURL(url, state, ref = '') {
  const next = new URL(url);
  const p = new URLSearchParams({ edition: state.script, section: String(state.section), script: state.chapter });
  if (state.compare !== 'none') p.set('compare', state.compare);
  if (state.finding) p.set('finding', state.finding);
  if (state.errors?.length) p.set('errors', state.errors.join(','));
  if (state.scope === 'corpus') p.set('scope', 'corpus');
  if (state.q) p.set('q', state.q);
  if (state.filter && state.filter !== 'all') p.set('filter', state.filter);
  next.search = p.toString();
  next.hash = ref ? encodeURIComponent(ref) : '';
  return next;
}
export const normalizeSearch = text => String(text || '').normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, '');
export function matches(row, query) {
  if (row.members) return row.members.some(member => matches(member, query));
  return matchesReaderText([row.enText, row.jaText, row.speaker, row.speakerJa, row.ref].join('\u0000'), query);
}
