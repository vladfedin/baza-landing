#!/usr/bin/env node
/**
 * check-static-links.mjs — каждая локальная ссылка страницы должна вести в файл,
 * который уезжает на сервер.
 *
 * Зачем: nginx отдаёт на любой неизвестный путь `/index.html` с кодом 200.
 * Страница, которой нет в `www/`, поэтому не падает в 404, а молча
 * притворяется главной. Так 02.09.2026 пропали `/tutorials-contest/` и
 * `/guides/`, и так же тихо после восстановления 05.09 остались отсутствовать
 * шесть страниц конкурсных работ: ссылки со страницы конкурса вели в никуда,
 * а сервер отвечал «200 OK».
 *
 * Проверка идёт по источнику деплоя, до rsync: ломается сборка, а не сайт.
 *
 *   node tools/check-static-links.mjs [корень, по умолчанию www]
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative, posix } from 'node:path';

const ROOT = resolve(process.argv[2] ?? 'www');

/** Схемы и якоря, за которые сайт не отвечает. */
const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|$)/i;

function htmlFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...htmlFiles(full));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

/** href/src/poster + каждый кандидат srcset + относительный og:image. */
function linksOf(html) {
  const links = [];
  const attr = /(?:href|src|poster)\s*=\s*"([^"]*)"/gi;
  for (const m of html.matchAll(attr)) links.push(m[1]);
  for (const m of html.matchAll(/srcset\s*=\s*"([^"]*)"/gi)) {
    for (const candidate of m[1].split(',')) links.push(candidate.trim().split(/\s+/)[0]);
  }
  for (const m of html.matchAll(/<meta[^>]+property="og:(?:image|video)"[^>]+content="([^"]*)"/gi)) {
    links.push(m[1]);
  }
  return links;
}

function exists(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

/** Путь, который nginx отдаст по ссылке: каталог означает его index.html. */
function targetPath(link, fromFile) {
  const clean = link.split('#')[0].split('?')[0];
  if (!clean) return null;
  const decoded = decodeURIComponent(clean);
  const base = decoded.startsWith('/') ? join(ROOT, decoded) : join(dirname(fromFile), decoded);
  return decoded.endsWith('/') ? join(base, 'index.html') : base;
}

const broken = [];
const pages = htmlFiles(ROOT).sort();
let checked = 0;

for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  for (const link of linksOf(html)) {
    if (EXTERNAL.test(link)) continue;
    const target = targetPath(link, page);
    if (!target) continue;
    checked++;
    if (exists(target)) continue;
    // Каталог без index.html — тоже дыра: nginx отдаст главную.
    broken.push({ page: relative(ROOT, page), link, target: relative(ROOT, target) });
  }
}

const label = `${pages.length} страниц, ${checked} локальных ссылок`;
if (broken.length === 0) {
  console.log(`[links] ${label} — все ведут в файлы источника`);
  process.exit(0);
}

console.error(`[links] ${label} — не ведут в файл: ${broken.length}`);
for (const item of broken) {
  console.error(`  ${item.page}  →  ${item.link}   (нет ${posix.normalize(item.target)})`);
}
console.error(
  '\nТакая ссылка не даёт 404: nginx отвечает 200 и отдаёт главную. ' +
  'Положите файл в www/ или уберите ссылку.'
);
process.exit(1);
