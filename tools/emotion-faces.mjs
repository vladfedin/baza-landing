#!/usr/bin/env node
/**
 * emotion-faces.mjs — лица фигурок лендинга (js/emotions.js) из исходных
 * эмоций персонажей приложения (magicorp-vtt/images/characters/<эмоция>/).
 *
 * Люди: кадр у эмоций тот же, что у основной картинки фигурки
 * (www/img/<имя>.avif), — лицо берёт её размер и ложится без сдвига.
 *
 * Сундук: его набор нарисован в разных масштабах кадра, поэтому каждый вид
 * выравнивается по корпусу — ширина и центр нижней полосы сундука (10–20 %
 * высоты над низом) и линия низа одинаковы во всех видах. `widthFix` —
 * поправка для фронтального вида, где полосу расширяют боковые ручки;
 * `flop` — зеркало: закрытые виды нарисованы в другую сторону, чем пасть, и
 * без зеркала сундук разворачивался бы, открываясь.
 *
 *   node tools/emotion-faces.mjs [путь к magicorp-vtt]
 *
 * sharp берётся из node_modules magicorp-vtt.
 */
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const APP = resolve(process.argv[2] ?? new URL('../../magicorp-vtt', import.meta.url).pathname);
const sharp = createRequire(join(APP, 'package.json'))('sharp');
const WWW = new URL('../www/img/', import.meta.url).pathname;
const ART = join(APP, 'images/characters');

/** Люди: обычная поза (основная картинка лендинга) → радостная (curious2) →
 *  спокойная (calm2) → раздражение (angry2). Поз с наведённым оружием нет
 *  (решение 2026-10-17). */
const PEOPLE_MOODS = { joyful: 'curious2', still: 'calm2', angry: 'angry2' };
const PEOPLE = {
  '1_elf': { src: '1_elf', moods: PEOPLE_MOODS },
  '2_machete': { src: '2_machete', moods: PEOPLE_MOODS },
  '3_cyber_woman': { src: '3_cyber_woman', moods: PEOPLE_MOODS },
  '5_detective': { src: '4_detective', moods: PEOPLE_MOODS },
};

/** Сундук: закрыт → глаза → язык → пасть → смотрит на тебя (решение 2026-10-17). */
const CHEST = {
  name: '4_chest', src: '0_chest', canvas: { w: 1024, h: 759 }, bandWidth: 600, bottomPad: 24,
  moods: {
    calm: { dir: 'calm2', flop: true }, curious: { dir: 'curious2', flop: true }, sly: { dir: 'sly', flop: true },
    angry: { dir: 'attack' }, attack: { dir: 'attack2', widthFix: 0.9 },
  },
};

const avif = (img, out) => img.avif({ quality: 52, effort: 6 }).toFile(out);

for (const [name, fig] of Object.entries(PEOPLE)) {
  const { width, height } = await sharp(join(WWW, `${name}.avif`)).metadata();
  for (const [mood, dir] of Object.entries(fig.moods)) {
    const out = join(WWW, 'emotions', `${name}-${mood}.avif`);
    const info = await avif(sharp(join(ART, dir, `${fig.src}.png`)).resize(width, height, { fit: 'fill' }), out);
    console.log(`${name}-${mood}: ${width}x${height} ${Math.round(info.size / 1024)} KB`);
  }
}

/** Низ, ширина и центр нижней полосы корпуса по альфе. */
async function bodyBand(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, on = (x, y) => data[(y * W + x) * 4 + 3] > 128;
  let top = H, bot = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (on(x, y)) { if (y < top) top = y; bot = Math.max(bot, y); }
  const y0 = Math.round(bot - (bot - top) * 0.2), y1 = Math.round(bot - (bot - top) * 0.1);
  let l = W, r = -1;
  for (let y = y0; y <= y1; y++) for (let x = 0; x < W; x++) if (on(x, y)) { l = Math.min(l, x); r = Math.max(r, x); }
  return { W, H, bottom: bot, width: r - l, cx: (l + r) / 2 };
}

const { w: CW, h: CH } = CHEST.canvas;
for (const [mood, { dir, widthFix = 1, flop = false }] of Object.entries(CHEST.moods)) {
  const raw = join(ART, dir, `${CHEST.src}.png`);
  const file = flop ? await sharp(raw).flop().png().toBuffer() : raw;
  const b = await bodyBand(file);
  const k = CHEST.bandWidth / (b.width * widthFix);
  const w = Math.round(b.W * k), h = Math.round(b.H * k);
  const left = Math.round(CW / 2 - b.cx * k), top = Math.round(CH - CHEST.bottomPad - b.bottom * k);
  const scaled = await sharp(file).resize(w, h).png().toBuffer();
  // холст фигурки; что вышло за край — обрезается
  const sx = Math.max(0, -left), sy = Math.max(0, -top);
  const piece = await sharp(scaled).extract({ left: sx, top: sy, width: Math.min(w - sx, CW - Math.max(0, left)), height: Math.min(h - sy, CH - Math.max(0, top)) }).toBuffer();
  const img = sharp({ create: { width: CW, height: CH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: piece, left: Math.max(0, left), top: Math.max(0, top) }]);
  const out = join(WWW, 'emotions', `${CHEST.name}-${mood}.avif`);
  const info = await avif(sharp(await img.png().toBuffer()), out);
  console.log(`${CHEST.name}-${mood}: ${dir} ×${k.toFixed(3)} ${Math.round(info.size / 1024)} KB`);
}
