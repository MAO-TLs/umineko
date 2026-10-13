const key = document.body.dataset.audit;
if (['witch-hunt', 'umineko-project', 'mangagamer'].includes(key)) {
  location.replace('../audit/?script=' + key + location.hash);
}
