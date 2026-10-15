#!/usr/bin/env node
/**
 * preview.mjs — локальный просмотр лендинга так, как его отдаст сервер.
 *
 *   node tools/preview.mjs [порт, по умолчанию 8790]
 *
 * - статика из `www/`, с Range-ответами (видео в Safari без них не играет);
 * - отсутствующий путь отдаёт `/index.html` с кодом 200, как nginx на проде —
 *   чтобы при просмотре видеть ту же подмену, которую ловит check-static-links;
 * - `/api/*` (только GET) пересылается в приложение: его CORS пускает лишь
 *   rolebaza.ru, а у локального просмотра другой origin (js/live.js).
 */
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { join, normalize, extname, resolve } from 'node:path';

const ROOT = resolve(new URL('../www', import.meta.url).pathname);
const PORT = Number(process.argv[2] ?? 8790);
const APP = 'https://beta.rolebaza.ru';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.avif': 'image/avif',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.mp4': 'video/mp4',
  '.opus': 'audio/ogg', '.pdf': 'application/pdf',
};

function fileFor(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]);
  const path = normalize(join(ROOT, clean));
  if (!path.startsWith(ROOT)) return null;
  for (const candidate of [path, join(path, 'index.html')]) {
    try { if (statSync(candidate).isFile()) return candidate; } catch { /* next */ }
  }
  return null;
}

async function proxy(req, res) {
  if (req.method !== 'GET') { res.writeHead(405).end(); return; }
  try {
    const upstream = await fetch(APP + req.url, { headers: { accept: 'application/json' } });
    res.writeHead(upstream.status, { 'content-type': upstream.headers.get('content-type') ?? 'application/json' });
    res.end(Buffer.from(await upstream.arrayBuffer()));
  } catch {
    res.writeHead(502).end();
  }
}

function serve(req, res) {
  const file = fileFor(req.url) ?? join(ROOT, 'index.html');
  const size = statSync(file).size;
  const type = TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream';
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
  if (range) {
    const start = range[1] ? Number(range[1]) : size - Number(range[2]);
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start > end || start < 0) { res.writeHead(416, { 'content-range': `bytes */${size}` }).end(); return; }
    res.writeHead(206, {
      'content-type': type, 'accept-ranges': 'bytes',
      'content-range': `bytes ${start}-${end}/${size}`, 'content-length': end - start + 1,
    });
    createReadStream(file, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { 'content-type': type, 'accept-ranges': 'bytes', 'content-length': size, 'cache-control': 'no-cache' });
  createReadStream(file).pipe(res);
}

createServer((req, res) => {
  if (req.url.startsWith('/api/')) proxy(req, res);
  else serve(req, res);
}).listen(PORT, '127.0.0.1', () => {
  console.log(`[preview] http://127.0.0.1:${PORT}/  (www: ${ROOT}, /api → ${APP})`);
});
