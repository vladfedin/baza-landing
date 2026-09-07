// Сборщик конкурсных работ в единые статьи (заголовок/автор/время чтения/оглавление).
// Источники: Дарья — telegra.ph source.json; Илья — dzen page.html; Александр — PDF-страницы.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, copyFileSync } from "fs";
import { join } from "path";

export const ROOT = "/media/ubuntu/1e309df2-8d25-44ba-a7d3-6952c23b6fe4/home/ubuntu/projects/magicorp-vtt/tools/contest_01";
export const OUT = join(ROOT, "works");

export const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const slugify = (s, i) => "s" + i;
export function readingTime(words) {
  const min = Math.max(1, Math.round(words / 170)); // ~170 слов/мин
  return `${min} мин чтения`;
}

// ── единый шаблон статьи ──
// data: { slug, kind('◇ Дзен'|'telegra.ph'|'PDF'), title, author, authorTag, place, date,
//         words, sourceUrl, sourceLabel, toc:[{id,text}], bodyHtml, nomination:{icon,name} }
export function renderArticle(data) {
  const toc = data.toc.length
    ? `<nav class="toc"><div class="toc-h">Оглавление</div><ol>${data.toc
        .map((t) => `<li><a href="#${t.id}">${esc(t.text)}</a></li>`)
        .join("")}</ol></nav>`
    : "";
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(data.title)} — ${esc(data.author)} · конкурс РолеБазы</title>
<meta name="description" content="${esc(data.title)}. Конкурсная работа ${esc(data.author)} — первый конкурс гайдов РолеБазы.">
<meta property="og:type" content="article"><meta property="og:title" content="${esc(data.title)}">
<meta property="og:description" content="Конкурсная работа ${esc(data.author)} — гайды сообщества РолеБазы.">
<link rel="icon" href="../../characters/favicon.ico">
<style>
  :root{
    --ink:#131118;--ink-2:#1a1720;--plate:#201c28;--plate-edge:rgba(201,164,92,0.22);
    --brass:#c9a45c;--brass-dim:#8a7448;--bone:#e9e2d2;--bone-dim:#a89f8c;--glow:rgba(255,190,96,0.10);
  }
  *{margin:0;padding:0;box-sizing:border-box}
  html{scroll-behavior:smooth}
  body{background:radial-gradient(1100px 500px at 50% -10%,#26202e 0%,transparent 60%),var(--ink);
    color:var(--bone);font-family:Georgia,'Iowan Old Style','Palatino Linotype',serif;min-height:100vh;padding:44px 24px 90px}
  body::after{content:'';position:fixed;inset:0;pointer-events:none;opacity:0.05;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E")}
  .wrap{max-width:1140px;margin:0 auto;display:grid;grid-template-columns:260px minmax(0,1fr);gap:44px;align-items:start}
  .crumb{grid-column:1/-1;font-size:12px;letter-spacing:0.24em;text-transform:uppercase;margin-bottom:6px}
  .crumb a{color:var(--brass);text-decoration:none}.crumb a:hover{color:var(--bone)}

  /* левая колонка: оглавление + мета (sticky) */
  .side{position:sticky;top:28px}
  .toc{border-left:1px solid var(--plate-edge);padding-left:18px;margin-bottom:26px}
  .toc-h{font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:var(--bone-dim);margin-bottom:12px}
  .toc ol{list-style:none;counter-reset:t}
  .toc li{counter-increment:t;margin-bottom:9px;line-height:1.4}
  .toc a{color:var(--bone);text-decoration:none;font-size:14px;display:block;padding-left:24px;position:relative}
  .toc a::before{content:counter(t,upper-roman);position:absolute;left:0;color:var(--brass-dim);font-size:12px}
  .toc a:hover{color:var(--brass)}
  .side .src{font-size:13px;color:var(--bone-dim);line-height:1.6}
  .side .src a{color:var(--brass);text-decoration:none;border-bottom:1px solid var(--brass-dim)}
  .side .src a:hover{color:var(--bone)}

  /* статья */
  .article{min-width:0}
  .a-kind{display:inline-flex;align-items:center;gap:8px;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;
    color:var(--brass);border:1px solid var(--brass-dim);border-radius:3px;padding:5px 12px;margin-bottom:18px}
  h1{font-size:clamp(28px,4vw,42px);font-weight:400;font-variant:small-caps;letter-spacing:0.04em;line-height:1.15;margin-bottom:16px}
  .byline{display:flex;flex-wrap:wrap;gap:8px 20px;font-size:14px;color:var(--bone-dim);padding-bottom:22px;margin-bottom:34px;border-bottom:1px solid var(--plate-edge)}
  .byline .who{color:var(--bone)}.byline .who b{color:var(--brass);font-weight:400}
  .byline svg{width:15px;height:15px;vertical-align:-2.5px;color:var(--brass-dim)}

  .body{font-size:17px;line-height:1.72}
  .body h2{font-size:26px;font-weight:400;font-variant:small-caps;letter-spacing:0.03em;color:var(--bone);
    margin:40px 0 16px;padding-top:12px;scroll-margin-top:24px}
  .body h3{font-size:20px;font-weight:400;color:var(--brass);margin:30px 0 12px;scroll-margin-top:24px}
  .body p{margin-bottom:18px}
  .body b,.body strong{color:var(--bone);font-weight:400;background:linear-gradient(transparent 62%,rgba(201,164,92,0.16) 0)}
  .body a{color:var(--brass);text-decoration:none;border-bottom:1px solid var(--brass-dim)}
  .body a:hover{color:var(--bone)}
  .body ul,.body ol{margin:0 0 18px 24px}.body li{margin-bottom:8px}
  .body blockquote{border-left:2px solid var(--brass-dim);padding-left:18px;color:var(--bone-dim);font-style:italic;margin:0 0 18px}
  .body figure{margin:26px 0}
  .body figure img,.body p img,.body img.inline{display:block;width:100%;border-radius:6px;border:1px solid var(--plate-edge);
    box-shadow:0 14px 34px rgba(0,0,0,0.45)}
  .body figcaption{margin-top:9px;font-size:13.5px;color:var(--bone-dim);font-style:italic;text-align:center}

  /* режим PDF-страниц */
  .pages{display:flex;flex-direction:column;gap:22px}
  .pages .pg{scroll-margin-top:24px}
  .pages img{display:block;width:100%;border-radius:6px;border:1px solid var(--plate-edge);box-shadow:0 14px 34px rgba(0,0,0,0.4)}
  .pages .pgn{font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:var(--bone-dim);margin:2px 0 8px}

  .foot{grid-column:1/-1;margin-top:56px;padding-top:22px;border-top:1px solid var(--plate-edge);
    display:flex;justify-content:space-between;flex-wrap:wrap;gap:14px;font-size:13px;color:var(--bone-dim)}
  .foot a{color:var(--brass);text-decoration:none}
  .nom{display:inline-flex;align-items:center;gap:8px;color:var(--brass);border:1px solid var(--brass-dim);border-radius:3px;padding:5px 12px;font-size:12px;letter-spacing:0.14em}

  @media(max-width:900px){
    .wrap{grid-template-columns:1fr;gap:24px}
    .side{position:static}
    .toc{border-left:none;border-top:1px solid var(--plate-edge);border-bottom:1px solid var(--plate-edge);padding:16px 0}
  }
</style>
</head>
<body>
<div class="wrap">
  <div class="crumb"><a href="../../">← Итоги конкурса</a></div>

  <aside class="side">
    ${toc}
    <div class="src">
      Источник: <a href="${esc(data.sourceUrl)}" target="_blank" rel="noopener">${esc(data.sourceLabel)}</a><br>
      Сохранено 16.07.2026
    </div>
  </aside>

  <article class="article">
    <div class="a-kind">${esc(data.kind)}</div>
    <h1>${esc(data.title)}</h1>
    <div class="byline">
      <span class="who">Автор: <b>${esc(data.author)}</b>${data.authorTag ? " " + esc(data.authorTag) : ""}</span>
      <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${esc(readingTime(data.words))}</span>
      <span>${esc(data.metaRight || (data.words.toLocaleString("ru-RU") + " слов" + (data.imgs ? " · " + data.imgs + " иллюстраций" : "")))}</span>
    </div>
    <div class="body">
${data.bodyHtml}
    </div>
  </article>

  <div class="foot">
    <span>Первый конкурс гайдов РолеБазы · июль 2026</span>
    ${data.nomination ? `<span class="nom">${data.nomination}</span>` : ""}
  </div>
</div>
</body>
</html>`;
}

// ── Дарья: source.json (telegra.ph) → body ──
export function buildDaria() {
  const src = JSON.parse(readFileSync(join(ROOT, "02-daria-di/source.json"), "utf-8"));
  const dir = join(OUT, "daria-di-token-actions");
  mkdirSync(join(dir, "images"), { recursive: true });
  // локальные картинки уже скачаны в 02-daria-di/images (img-01..09) в порядке появления
  const localImgs = readdirSync(join(ROOT, "02-daria-di/images")).filter((f) => /^img-/.test(f)).sort();
  for (const f of localImgs) copyFileSync(join(ROOT, "02-daria-di/images", f), join(dir, "images", f));

  const toc = [];
  let imgN = 0, words = 0, headingIdx = 0;
  const textLen = (s) => (words += (s.match(/\S+/g) || []).length);

  function inline(nodes) {
    let h = "";
    for (const n of nodes) {
      if (typeof n === "string") { h += esc(n); textLen(n); continue; }
      const t = n.tag, inner = n.children ? inline(n.children) : "";
      if (t === "a") h += `<a href="${esc(n.attrs?.href || "#")}" target="_blank" rel="noopener">${inner}</a>`;
      else if (t === "br") h += "<br>";
      else if (t === "strong" || t === "b") h += `<b>${inner}</b>`;
      else if (t === "em" || t === "i") h += `<i>${inner}</i>`;
      else if (t === "code") h += `<code>${inner}</code>`;
      else h += inner;
    }
    return h;
  }
  function block(nodes) {
    let h = "";
    for (const n of nodes) {
      if (typeof n === "string") { if (n.trim()) h += `<p>${esc(n)}</p>`; textLen(n); continue; }
      const t = n.tag;
      if (t === "h3" || t === "h4") {
        const id = "s" + (++headingIdx); const txt = inline(n.children || []);
        toc.push({ id, text: txt.replace(/<[^>]+>/g, "") });
        h += `<h2 id="${id}">${txt}</h2>`;
      } else if (t === "p") h += `<p>${inline(n.children || [])}</p>`;
      else if (t === "ul" || t === "ol") h += `<${t}>${(n.children || []).map((li) => `<li>${inline(li.children || [])}</li>`).join("")}</${t}>`;
      else if (t === "blockquote") h += `<blockquote>${block(n.children || [])}</blockquote>`;
      else if (t === "figure") {
        const img = (n.children || []).find((c) => c.tag === "img");
        const cap = (n.children || []).find((c) => c.tag === "figcaption");
        const local = localImgs[imgN++] || "";
        h += `<figure><img src="images/${local}" alt="" loading="lazy">${cap ? `<figcaption>${inline(cap.children || [])}</figcaption>` : ""}</figure>`;
      } else if (t === "img") {
        const local = localImgs[imgN++] || "";
        h += `<figure><img src="images/${local}" alt="" loading="lazy"></figure>`;
      } else if (n.children) h += block(n.children);
    }
    return h;
  }
  const bodyHtml = block(src.content || []);
  const html = renderArticle({
    slug: "daria-di-token-actions", kind: "◇ telegra.ph",
    title: "Добавление действий для токенов", author: "Daria Di", authorTag: "(@inconsolelog)",
    words, imgs: imgN, sourceUrl: "https://telegra.ph/Dobavlenie-dejstvij-dlya-tokenov-06-13",
    sourceLabel: "telegra.ph", toc, bodyHtml,
    nomination: "✧ Тайное знание",
  });
  writeFileSync(join(dir, "index.html"), html);
  console.log(`Дарья: ${words} слов, ${imgN} картинок, ${toc.length} разделов → ${dir}`);
  return { slug: "daria-di-token-actions", words, imgs: imgN };
}

if (process.argv[2] === "daria") buildDaria();
