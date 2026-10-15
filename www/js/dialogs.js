/*
  Dialogs: a button with data-dialog-open="<id>" opens <dialog id="<id>">.
  ---------------------------------------------------------------------------
  The native <dialog> keeps focus inside and closes on Esc; here it also closes
  on [data-dialog-close] and on a click on the backdrop, and fades in and out
  over 160 ms (the closing class plays before the dialog really closes).
*/
(function () {
  'use strict';
  var FADE_MS = 160;

  function close(dialog) {
    if (!dialog.open || dialog.classList.contains('is-closing')) return;
    dialog.classList.add('is-closing');
    setTimeout(function () { dialog.classList.remove('is-closing'); dialog.close(); }, FADE_MS);
  }

  function wire() {
    document.querySelectorAll('[data-dialog-open]').forEach(function (btn) {
      var dialog = document.getElementById(btn.getAttribute('data-dialog-open'));
      if (!dialog || typeof dialog.showModal !== 'function') return;
      btn.addEventListener('click', function () { dialog.showModal(); });
    });
    document.querySelectorAll('dialog').forEach(function (dialog) {
      dialog.addEventListener('click', function (e) {
        if (e.target === dialog) close(dialog);          // the backdrop is the dialog itself
        if (e.target.closest && e.target.closest('[data-dialog-close]')) close(dialog);
      });
      dialog.addEventListener('cancel', function (e) { e.preventDefault(); close(dialog); });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();
