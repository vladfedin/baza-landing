/* theme-toggle.js — action-bar theme switch for the landing page.
 *
 * Two palettes, toggled by a `data-theme` attribute on <html> (see the token
 * blocks in css/styles.css):
 *   · default (no attribute)  = "Blackout"  — near-black gold palette (DARK, default)
 *   · data-theme="parchment"  = "Parchment" — warm light-brown paper (LIGHT)
 *
 * The choice persists in localStorage under 'rb-theme'. A tiny inline script in
 * <head> applies the saved value before first paint (no flash) — or, before any
 * choice, the system's light preference; this file wires the button.
 *
 * An explicit choice is also written to the cookie 'rb_theme' on .rolebaza.ru
 * as the app's theme name (Blackout = 'arcane', Parchment = 'parchment'): the app
 * opens in it for a visitor who has not picked a theme there yet.
 */
(function () {
  'use strict';

  var KEY = 'rb-theme';
  var root = document.documentElement;

  function current() {
    return root.getAttribute('data-theme') === 'parchment' ? 'parchment' : 'blackout';
  }

  function apply(theme) {
    if (theme === 'parchment') {
      root.setAttribute('data-theme', 'parchment');
    } else {
      root.removeAttribute('data-theme');   // blackout is the CSS default
    }
    try { localStorage.setItem(KEY, theme); } catch (e) { /* storage blocked */ }
    shareWithApp(theme);
    sync();
  }

  function shareWithApp(theme) {
    var appTheme = theme === 'parchment' ? 'parchment' : 'arcane';
    var domain = /(^|\.)rolebaza\.ru$/.test(location.hostname) ? '; Domain=rolebaza.ru' : '';
    document.cookie = 'rb_theme=' + appTheme + domain + '; Path=/; Max-Age=31536000; SameSite=Lax; Secure';
  }

  var btn;

  // reflect state on the button: it advertises the theme it will switch TO
  function sync() {
    if (!btn) return;
    var toLight = current() === 'blackout';           // dark now -> next is light
    btn.setAttribute('aria-pressed', String(!toLight)); // pressed = light (parchment) active
    btn.setAttribute('title', toLight ? 'Светлая тема' : 'Тёмная тема');
    btn.setAttribute('aria-label', toLight ? 'Включить светлую тему' : 'Включить тёмную тему');
  }

  function init() {
    btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      apply(current() === 'parchment' ? 'blackout' : 'parchment');
    });
    sync();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
