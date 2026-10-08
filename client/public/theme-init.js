// Light or dark before the first paint: the saved choice, else the system setting.
// useTheme keeps it in sync after that. A file rather than an inline script so
// the Content-Security-Policy in vercel.json can block every inline script.
(function () {
  var saved
  try { saved = localStorage.getItem('cb-mode') } catch (e) {}
  var dark = saved ? saved === 'noir' : matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.dataset.theme = dark ? 'noir' : 'paper'
})()
