/*
  Background-music player.
  ---------------------------------------------------------------------------
  - The in-card control (inside the "Музыка и голосовая связь" arsenal card) has
    a play/pause toggle + a volume slider.
  - A second play/pause button lives in the sticky action bar (right cluster),
    styled like the other bar buttons, so playback is always reachable. Both
    toggles drive the same <audio> and stay in sync (icon + aria).
  - Streams sfx/bg_music.opus (looping); preloading is kicked off on window
    'load' so the file is buffered by the time the reader scrolls down.
*/
document.addEventListener('DOMContentLoaded', function () {
  var player    = document.getElementById('music-player');
  var toggle    = document.getElementById('music-toggle');       // in-card
  var toggleBar = document.getElementById('music-toggle-bar');   // action bar
  var audio     = document.getElementById('bg-music');
  var vol       = document.getElementById('music-vol');
  if (!toggle || !audio || !vol) return;

  var ICON_BASE = 'img/icons.svg#';               // build.ps1 rewrites this to "#" for the inlined sprite
  function setIcon(use, id) {
    if (!use) return;
    var href = use.getAttribute('href');
    var base = (href && href.charAt(0) === '#') ? '#' : ICON_BASE;
    use.setAttribute('href', base + id);
  }
  var icon    = toggle.querySelector('use');
  var iconBar = toggleBar && toggleBar.querySelector('use');

  /* ---- volume (in-card slider) ---- */
  audio.volume = parseFloat(vol.value);
  vol.addEventListener('input', function () { audio.volume = parseFloat(vol.value); });

  /* ---- play / pause — both toggles share this ---- */
  function reflect() {
    var playing = !audio.paused && !audio.ended;
    setIcon(icon,    playing ? 'pause' : 'play');
    setIcon(iconBar, playing ? 'pause' : 'play');
    var label = playing ? 'Пауза' : 'Играть фоновую музыку';
    toggle.setAttribute('aria-pressed', playing ? 'true' : 'false');
    toggle.setAttribute('aria-label', label);
    if (toggleBar) {
      toggleBar.setAttribute('aria-pressed', playing ? 'true' : 'false');
      toggleBar.setAttribute('aria-label', label);
    }
    if (player) player.classList.toggle('is-playing', playing);
  }
  function togglePlay() {
    if (audio.paused) {
      var p = audio.play();
      if (p && p.catch) p.catch(function () {});   // ignore autoplay-policy rejections
    } else {
      audio.pause();
    }
  }
  toggle.addEventListener('click', togglePlay);
  if (toggleBar) toggleBar.addEventListener('click', togglePlay);
  audio.addEventListener('play', reflect);
  audio.addEventListener('pause', reflect);
  audio.addEventListener('ended', reflect);

  /* ---- preload after the rest of the site has loaded ---- */
  function preload() {
    if (audio.preload !== 'auto') { audio.preload = 'auto'; audio.load(); }
  }
  if (document.readyState === 'complete') preload();
  else window.addEventListener('load', preload);
});
