// Александр: PDF → 48 страниц-картинок в единой обложке + оглавление из 14 разделов со ссылками на страницы.
import { execSync } from "child_process";
import { readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { renderArticle, esc, OUT, ROOT } from "./build.mjs";

const dir = join(OUT, "aleksandr-pdf");
const pdf = join(ROOT, "03-aleksandr/rolebaza-guide.pdf");

// 14 разделов (со страницы оглавления) → страница начала.
// 10 выверены по центрированным заголовкам в PDF, 4 (§2,§3,§8,§13) — между соседями (~).
const SECTIONS = [
  ["Создание игровой сессии", 2],
  ["Ознакомление с интерфейсом комнаты", 3],
  ["Добавление системы правил", 4],
  ["Создание сцен", 5],
  ["Настройка камер для сцен", 7],
  ["Создание порталов", 9],
  ["Декорации", 11],
  ["Создание персонажей и существ", 14],
  ["Действия", 20],
  ["Боевые сцены", 23],
  ["Компендиум", 24],
  ["Туман", 25],
  ["Углублённая работа с компендиумом", 28],
  ["Музыка", 32],
];
const toc = SECTIONS.map(([title, pg], i) => ({ id: `p${pg}`, text: `${i + 1}. ${title}` }));

// тело: все страницы как картинки, id p1..pN
const files = readdirSync(join(dir, "pages")).filter((f) => /^page-\d+\.png$/.test(f)).sort();
let body = `<div class="pages">\n`;
files.forEach((f, i) => {
  const n = i + 1;
  body += `  <div class="pg" id="p${n}"><div class="pgn">Страница ${n} / ${files.length}</div><img src="pages/${f}" alt="Страница ${n}" loading="lazy"></div>\n`;
});
body += `</div>`;

const html = renderArticle({
  slug: "aleksandr-pdf", kind: "PDF · 48 страниц",
  title: "РолеБаза: гайд для перехода с реального стола на виртуальный",
  author: "Александр", authorTag: "(@Alex_coffeincor)",
  words: 9060, metaRight: "9 060 слов · 48 страниц · ~117 иллюстраций",
  sourceUrl: "rolebaza-guide.pdf", sourceLabel: "Скачать оригинал PDF",
  toc, bodyHtml: body, nomination: "❦ Гримуар Мастера",
});
writeFileSync(join(dir, "index.html"), html);
console.log(`Александр: 48 страниц, ${toc.length} разделов в оглавлении`);
console.log("Оглавление → страницы:");
toc.forEach((t) => console.log(`  ${t.text} → ${t.id}`));
