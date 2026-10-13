// Match Fate's InstallAnchorRelease: scroll once, then release the hash so
// later layout changes or reloads do not keep snapping back to installation.
let frame;
function releaseInstallAnchor() {
  if (location.hash !== '#install') return;
  const target = document.getElementById('install');
  if (!target) return;
  history.replaceState(history.state, '', location.pathname + location.search);
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => target.scrollIntoView({ behavior: 'auto', block: 'start' }));
}
document.addEventListener('click', event => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest('a[href="#install"]');
  if (!link) return;
  event.preventDefault();
  history.replaceState(history.state, '', '#install');
  releaseInstallAnchor();
});
window.addEventListener('hashchange', releaseInstallAnchor);
releaseInstallAnchor();
