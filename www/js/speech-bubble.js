/*
  Character speech bubbles (reusable).
  --------------------------------------------------------------------------
  Any element marked as a speaker gets a fantasy speech bubble that pops in
  when it scrolls into view, and re-pops on each subsequent re-entry:

      <div class="speaker" data-speech="Инструменты на любой вкус!">...</div>

  The bubble markup is injected here (author only supplies the text), so
  adding a new character later is just another .speaker[data-speech] element
  — no markup, CSS, or JS changes needed. The line can differ per speaker.

  Positioning + styling live in css/styles.css (.speech-bubble). Respects
  prefers-reduced-motion: the CSS shows the bubble without the pop animation.
*/
document.addEventListener('DOMContentLoaded', function () {
  var speakers = document.querySelectorAll('.speaker[data-speech]');
  if (!speakers.length) return;

  // inject one bubble per speaker
  speakers.forEach(function (el) {
    var text = el.getAttribute('data-speech');
    if (!text) return;
    var bubble = document.createElement('div');
    bubble.className = 'speech-bubble';
    var body = document.createElement('div');
    body.className = 'speech-bubble__body';
    body.textContent = text;
    bubble.appendChild(body);
    el.appendChild(bubble);
    el._speechBubble = bubble;   // remember it for the observer below
  });

  // No IntersectionObserver: just show every bubble.
  if (!('IntersectionObserver' in window)) {
    speakers.forEach(function (el) {
      if (el._speechBubble) el._speechBubble.classList.add('is-visible');
    });
    return;
  }

  // Toggle .is-visible so the bubble pops in on entry and re-pops next time.
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var bubble = e.target._speechBubble;
      if (!bubble) return;
      if (e.isIntersecting) bubble.classList.add('is-visible');
      else bubble.classList.remove('is-visible');
    });
  }, { threshold: 0.01, rootMargin: '0px 0px -25% 0px' });

  speakers.forEach(function (el) { io.observe(el); });
});
