#!/usr/bin/env node
/**
 * version-assets.mjs — шаг деплоя: каждой локальной ссылке на файл страницы
 * корня `www/` и каждому `url()` в `www/css/` дописывается `?v=<md5>`.
 *
 * Зачем: nginx отдаёт css/js неделю, а видео и картинки — месяц с
 * `immutable`. Без версии в адресе посетитель после выкатки видит старые
 * стили и ролики. Версия — хэш содержимого: изменился файл — изменился адрес.
 *
 * Меняет файлы на месте, поэтому запускается только в CI, на копии checkout.
 * Порядок: сначала CSS (его хэш зависит от версий шрифтов внутри), потом HTML.
 *
 *   node tools/version-assets.mjs [корень, по умолчанию www]
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve, extname } from 'node:path';
import { attrRefs, cssUrlRefs, EXTERNAL, TEMPLATE } from './asset-refs.mjs';

const ROOT = resolve(process.argv[2] ?? 'www');

const hashOf = new Map();
function versionOf(path) {
  if (!hashOf.has(path)) {
    hashOf.set(path, createHash('md5').update(readFileSync(path)).digest('hex').slice(0, 8));
  }
  return hashOf.get(path);
}

function isFile(path) {
  try { return statSync(path).isFile(); } catch { return false; }
}

/** Ссылка с версией или null, если версионировать нечего. */
function versioned(link, fromFile) {
  if (EXTERNAL.test(link) || TEMPLATE.test(link)) return null;
  const hashAt = link.indexOf('#');
  const fragment = hashAt >= 0 ? link.slice(hashAt) : '';
  const path = hashAt >= 0 ? link.slice(0, hashAt) : link;
  if (!path || path.includes('?')) return null;          // уже с параметрами — не наше
  const target = path.startsWith('/') ? join(ROOT, path) : join(dirname(fromFile), path);
  // Страницы не версионируем: их адрес — публичный, кэш у них короткий.
  if (!isFile(target) || extname(target) === '.html') return null;
  return `${path}?v=${versionOf(target)}${fragment}`;
}

function rewrite(file, refs) {
  const text = readFileSync(file, 'utf8');
  let out = '', at = 0, n = 0;
  for (const ref of refs(text)) {
    const next = versioned(ref.value, file);
    if (!next) continue;
    out += text.slice(at, ref.start) + next;
    at = ref.end;
    n++;
  }
  out += text.slice(at);
  if (n) writeFileSync(file, out);
  return n;
}

const cssDir = join(ROOT, 'css');
let total = 0;
for (const name of readdirSync(cssDir).filter((f) => f.endsWith('.css'))) {
  const n = rewrite(join(cssDir, name), cssUrlRefs);
  total += n;
  console.log(`[version] css/${name}: ${n}`);
}
// Только корень: страницы конкурсов и гайдов — архивы со своими ресурсами.
for (const name of readdirSync(ROOT).filter((f) => f.endsWith('.html'))) {
  const n = rewrite(join(ROOT, name), attrRefs);
  total += n;
  console.log(`[version] ${name}: ${n}`);
}
console.log(`[version] всего ссылок с версией: ${total}`);
