/**
 * asset-refs.mjs — где страница называет файлы источника.
 *
 * Один список на двоих: проверка ссылок (check-static-links.mjs) смотрит те же
 * атрибуты, которым деплой ставит версию (version-assets.mjs). Разойдутся —
 * получим либо файл без версии (браузер месяц держит старый ролик: nginx
 * отдаёт видео и картинки с `immutable`), либо версию на несуществующий файл.
 *
 * Пути, которые скрипт страницы собирает сам, сюда не попадают — поэтому
 * лендинг держит их в разметке (`data-av1`, `data-hevc`, `data-three`…).
 */

/** Атрибуты, значение которых — путь к файлу. */
export const FILE_ATTRS = [
  'href', 'src', 'poster',
  'data-av1', 'data-hevc', 'data-avatar', 'data-three', 'data-cannon', 'data-copy',
  'data-font-digits', 'data-font-brand',
];

/** Схемы и якоря, за которые сайт не отвечает. */
export const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|$)/i;

/** Шаблон, который страница собирает в скрипте (`src="${f}"`): адреса ещё нет,
 *  проверять статически нечего — за такие файлы отвечает сборка страницы. */
export const TEMPLATE = /\$\{/;

// (?<![\w-]) — чтобы `src` не находился внутри `data-src`.
const ATTR_RE = new RegExp(`(?<![\\w-])(${FILE_ATTRS.join('|')})\\s*=\\s*"([^"]*)"`, 'gi');

/** Все значения файловых атрибутов: [{ attr, value, start, end }] (start/end — значения). */
export function attrRefs(html) {
  const out = [];
  for (const m of html.matchAll(ATTR_RE)) {
    const start = m.index + m[0].length - m[2].length - 1;
    out.push({ attr: m[1].toLowerCase(), value: m[2], start, end: start + m[2].length });
  }
  return out;
}

/** `url(...)` в CSS: [{ value, start, end }]. */
export function cssUrlRefs(css) {
  const out = [];
  for (const m of css.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)) {
    const start = m.index + m[0].indexOf(m[2], 4);
    out.push({ value: m[2], start, end: start + m[2].length });
  }
  return out;
}
