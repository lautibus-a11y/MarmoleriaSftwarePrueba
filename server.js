import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import workerHandler from './worker/src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, 'frontend');
const PORT = 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // ── Dispatch API requests to Cloudflare Worker Handler ──
  if (req.url.startsWith('/api')) {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', async () => {
      try {
        const body = ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks);
        const fullUrl = `http://${req.headers.host || 'localhost:' + PORT}${req.url}`;
        const webReq = new Request(fullUrl, {
          method: req.method,
          headers: req.headers,
          body
        });

        // Mock env for local execution
        const env = {};
        const webRes = await workerHandler.fetch(webReq, env, {});

        const headers = Object.fromEntries(webRes.headers.entries());
        res.writeHead(webRes.status, headers);
        const resBuffer = Buffer.from(await webRes.arrayBuffer());
        res.end(resBuffer);
      } catch (err) {
        console.error('Local API error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: true, message: err.message }));
      }
    });
    return;
  }

  // ── Static Frontend Files ──
  const urlPath = req.url.split('?')[0];
  const safePath = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(ROOT, safePath === '/' ? 'index.html' : safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(ROOT, 'index.html');
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500);
        res.end('Server Error');
        return;
      }
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(content);
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`API endpoints available at http://localhost:${PORT}/api/`);
});
