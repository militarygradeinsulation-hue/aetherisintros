/* Run before hydration so first-time visitors see light mode immediately.
 * Explicit choices from either current or legacy storage remain in effect. */
(function () {
  var mode = 'light';
  try {
    var saved = window.localStorage.getItem('ask-intros.appearance');
    var legacy = window.localStorage.getItem('aetheris.home.theme');
    if (saved === 'light' || saved === 'dark') mode = saved;
    else if (legacy === 'light' || legacy === 'dark') mode = legacy;
  } catch (_) { /* Storage may be unavailable. */ }
  var root = document.documentElement;
  root.dataset.theme = mode;
  root.classList.toggle('dark', mode === 'dark');
  root.classList.toggle('light', mode === 'light');
  root.style.colorScheme = mode;
})();
