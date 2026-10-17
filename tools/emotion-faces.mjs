#!/usr/bin/env node
/**
 * emotion-faces.mjs — лица фигурок лендинга (js/emotions.js) из исходных
 * эмоций персонажей приложения (magicorp-vtt/images/characters/<эмоция>/).
 * Размер — как у основной картинки фигурки на лендинге (www/img/<имя>.avif):
 * кадр у эмоций тот же, поэтому лицо ложится поверх без сдвига.
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

/** Фигурка лендинга → исходник и эмоции. Атака — attack2: у attack остатки фона у ног. */
const FIGURES = {
  '1_elf': { src: '1_elf', moods: { curious: 'curious', angry: 'angry', attack: 'attack2' } },
  '2_machete': { src: '2_machete', moods: { curious: 'curious', angry: 'angry', attack: 'attack2' } },
  '3_cyber_woman': { src: '3_cyber_woman', moods: { curious: 'curious', angry: 'angry', attack: 'attack2' } },
  '4_chest': { src: '0_chest', moods: { curious: 'curious', angry: 'angry', attack: 'attack2' } },
  '5_detective': { src: '4_detective', moods: { curious: 'curious', angry: 'angry', attack: 'attack2' } },
};

for (const [name, fig] of Object.entries(FIGURES)) {
  const { width, height } = await sharp(join(WWW, `${name}.avif`)).metadata();
  for (const [mood, dir] of Object.entries(fig.moods)) {
    const out = join(WWW, 'emotions', `${name}-${mood}.avif`);
    const info = await sharp(join(APP, 'images/characters', dir, `${fig.src}.png`))
      .resize(width, height, { fit: 'fill' })
      .avif({ quality: 52, effort: 6 })
      .toFile(out);
    console.log(`${name}-${mood}: ${width}x${height} ${Math.round(info.size / 1024)} KB`);
  }
}
