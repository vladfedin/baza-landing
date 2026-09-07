// Илья: 4 статьи на Дзене → единый шаблон. Тело + инлайн-картинки; картинки берём из
// перехваченных сетевых ответов (браузер уже скачал их при прокрутке — валидны, без CDN-перезапроса).
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { renderArticle, esc, OUT } from "./build.mjs";

const SERIES = [
  { slug: "ilya-players",     url: "https://dzen.ru/a/aikgYpdJdle1R6Gb", tag: "Игрокам" },
  { slug: "ilya-masters-1",   url: "https://dzen.ru/a/ai2BvQuleHEBjAjN", tag: "Мастерам · ч.1" },
  { slug: "ilya-masters-2",   url: "https://dzen.ru/a/ajE0Yg6RPnTs4ZBN", tag: "Мастерам · ч.2" },
  { slug: "ilya-compendiums", url: "https://dzen.ru/a/aj0EBct7GCf4REu6", tag: "Компендиумы" },
];

function seriesNav(currentSlug) {
  const items = SERIES.map((s) =>
    s.slug === currentSlug ? `<span class="cur">${esc(s.tag)}</span>` : `<a href="../${s.slug}/">${esc(s.tag)}</a>`
  ).join("");
  return `<div class="series"><span class="series-h">Серия «Гайды Ильи»:</span>${items}</div>
<style>.series{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin-bottom:30px;padding:14px 16px;border:1px solid var(--plate-edge);border-radius:4px;background:var(--ink-2);font-size:13.5px}
.series-h{color:var(--bone-dim);letter-spacing:0.04em}.series a{color:var(--brass);text-decoration:none;border-bottom:1px solid var(--brass-dim)}.series a:hover{color:var(--bone)}.series .cur{color:var(--bone);border-bottom:1px solid var(--brass)}</style>`;
}

// Валидное изображение = верный magic (PNG \x89PNG / JPEG \xFFD8) и размер > 8КБ. Ретраи с паузой.
const isImg = (b) => b && b.length > 8000 && ((b[0] === 0x89 && b[1] === 0x50) || (b[0] === 0xff && b[1] === 0xd8));
async function downloadValid(urls) {
  for (let attempt = 0; attempt < 4; attempt++) {
    for (const u of urls) {
      if (!u) continue;
      try {
        const r = await ctx.request.get(u, { timeout: 25000, headers: { referer: "https://dzen.ru/", "user-agent": "Mozilla/5.0" } });
        if (r.ok()) { const b = await r.body(); if (isImg(b)) return b; }
      } catch {}
    }
    await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
  }
  return null;
}

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const ctx = await browser.newContext({
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  viewport: { width: 1000, height: 1400 }, locale: "ru-RU",
});

for (let i = 0; i < SERIES.length; i++) {
  const s = SERIES[i];
  const dir = join(OUT, s.slug);
  mkdirSync(join(dir, "images"), { recursive: true });

  const page = await ctx.newPage();
  try { await page.goto(s.url, { waitUntil: "domcontentloaded", timeout: 45000 }); } catch {}
  let last = 0, stable = 0;
  for (let k = 0; k < 45; k++) {
    await page.evaluate(() => window.scrollBy(0, Math.round(window.innerHeight * 0.8)));
    await page.waitForTimeout(650);
    const len = await page.evaluate(() => document.body.innerText.length);
    if (len === last) { if (++stable >= 5) break; } else { stable = 0; last = len; }
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);

  const data = await page.evaluate(() => {
    const title = document.querySelector('meta[property="og:title"]')?.content || document.title;
    const cont = document.querySelector('[class*="article-render__container"]')
      || document.querySelector('[class*="article-render"]') || document.querySelector("article");
    if (!cont) return { title, blocks: [] };
    function inlineHtml(el) {
      let out = "";
      for (const node of el.childNodes) {
        if (node.nodeType === 3) { out += node.textContent; continue; }
        if (node.nodeType !== 1) continue;
        const tag = node.tagName.toLowerCase();
        if (tag === "a") out += `<a href="${node.getAttribute("href") || "#"}">${inlineHtml(node)}</a>`;
        else if (tag === "b" || tag === "strong") out += `<b>${inlineHtml(node)}</b>`;
        else if (tag === "i" || tag === "em") out += `<i>${inlineHtml(node)}</i>`;
        else if (tag === "br") out += "<br>";
        else out += inlineHtml(node);
      }
      return out;
    }
    const imgOf = (img) => {
      if (!img) return null;
      const s = img.currentSrc || img.src || "";
      if (!/dzeninfra/.test(s)) return null;
      if (img.naturalWidth && img.naturalWidth < 240) return null;
      const key = (s.match(/pub_[0-9a-f]+_[0-9a-f]+/) || [null])[0]; if (!key) return null;
      return { key, hi: s.replace(/\/(scale_\d+|lazy_smart_crop_\w+|smart_crop_\w+)(\?.*)?$/, "/scale_1200"), orig: s };
    };
    const blocks = []; const seen = new Set();
    for (const el of cont.querySelectorAll("h1,h2,h3,h4,p,figure,img,ul,ol,blockquote")) {
      const tag = el.tagName.toLowerCase();
      if (tag === "img") {
        if (el.closest("figure")) continue;
        const m = imgOf(el); if (!m || seen.has(m.key)) continue; seen.add(m.key);
        blocks.push({ t: "img", ...m });
      } else if (tag === "figure") {
        const m = imgOf(el.querySelector("img")); if (!m || seen.has(m.key)) continue; seen.add(m.key);
        const cap = el.querySelector("figcaption");
        blocks.push({ t: "img", ...m, cap: cap ? cap.innerText.trim() : "" });
      } else if (tag === "h1") { continue; }
      else if (tag === "h2" || tag === "h3" || tag === "h4") { const txt = el.innerText.trim(); if (txt) blocks.push({ t: "h", text: txt }); }
      else if (tag === "p") {
        if (el.closest("figure,blockquote")) continue;
        const html = inlineHtml(el).trim(); const txt = el.innerText.trim();
        if (txt && !/^читайте также/i.test(txt)) blocks.push({ t: "p", html });
      } else if (tag === "ul" || tag === "ol") {
        const items = [...el.querySelectorAll(":scope > li")].map((li) => inlineHtml(li).trim()).filter(Boolean);
        if (items.length) blocks.push({ t: tag, items });
      } else if (tag === "blockquote") blocks.push({ t: "quote", html: inlineHtml(el).trim() });
    }
    return { title, blocks };
  });

  const toc = []; let words = 0, imgN = 0, hIdx = 0, missImg = 0;
  let body = seriesNav(s.slug);
  for (const b of data.blocks) {
    if (b.t === "h") { const id = "s" + (++hIdx); toc.push({ id, text: b.text }); body += `<h2 id="${id}">${esc(b.text)}</h2>\n`; words += (b.text.match(/\S+/g) || []).length; }
    else if (b.t === "p") { body += `<p>${b.html}</p>\n`; words += (b.html.replace(/<[^>]+>/g, "").match(/\S+/g) || []).length; }
    else if (b.t === "ul" || b.t === "ol") { body += `<${b.t}>${b.items.map((x) => `<li>${x}</li>`).join("")}</${b.t}>\n`; words += b.items.join(" ").replace(/<[^>]+>/g, "").split(/\s+/).length; }
    else if (b.t === "quote") body += `<blockquote><p>${b.html}</p></blockquote>\n`;
    else if (b.t === "img") {
      const buf = await downloadValid([b.hi, b.orig]);
      if (!buf) { missImg++; continue; }
      imgN++; const ext = buf[0] === 0x89 ? "png" : "jpg";
      const fn = `img-${String(imgN).padStart(2, "0")}.${ext}`;
      writeFileSync(join(dir, "images", fn), buf);
      body += `<figure><img src="images/${fn}" alt="" loading="lazy">${b.cap ? `<figcaption>${esc(b.cap)}</figcaption>` : ""}</figure>\n`;
    }
  }

  const html = renderArticle({
    slug: s.slug, kind: "◇ Дзен", title: data.title, author: "Илья Лемешев", authorTag: "",
    words, imgs: imgN, sourceUrl: s.url, sourceLabel: "Дзен", toc, bodyHtml: body,
    nomination: i === 0 ? "❖ Летопись Первопроходца" : "",
  });
  writeFileSync(join(dir, "index.html"), html);
  console.log(`${s.slug}: «${data.title}» — ${words} слов, ${imgN} картинок${missImg ? " (без " + missImg + ")" : ""}, ${toc.length} разделов`);
  await page.close();
}
await browser.close();
console.log("Илья готов");
