import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('.', import.meta.url));
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const allowed = new Set(['index.html', 'styles.css', 'app.js', 'practice.js', 'favicon.svg', 'pwa.js', 'sw.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png']);
const port = Number(process.env.PORT) || 5173;
createServer(async (req, res) => {
  try {
    const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, '') || 'index.html';
    if (!allowed.has(name)) { res.writeHead(404); res.end('Not found'); return; }
    const content = await readFile(path.join(root, name));
    res.writeHead(200, { 'Content-Type': types[path.extname(name)] + (path.extname(name) === '.png' ? '' : '; charset=utf-8'), 'Cache-Control': 'no-cache' });
    res.end(content);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(port, '0.0.0.0', () => console.log(`Chord Change is running at http://localhost:${port}`));
