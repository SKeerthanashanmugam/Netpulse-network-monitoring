import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTargets, selectTargets, runProbeBatch } from '../lib/netpulse/probe.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const port = Number(process.env.PORT || process.env.NETPULSE_API_PORT || 3001);
const host = process.env.HOST || (process.env.PORT ? '0.0.0.0' : '127.0.0.1');
// Render terminates HTTPS before forwarding HTTP to this server.
const externalOrigin = process.env.RENDER_EXTERNAL_URL ? new URL(process.env.RENDER_EXTERNAL_URL).origin : null;
let targets;
try { targets = parseTargets(process.env.NETPULSE_TARGETS_JSON); }
catch { console.error('Invalid NETPULSE_TARGETS_JSON. See docs/SETUP.md.'); process.exit(1); }

function json(response, code, value) {
  response.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  response.end(JSON.stringify(value));
}
async function body(request) {
  let value = '';
  for await (const chunk of request) { value += chunk.toString('utf8'); if (Buffer.byteLength(value) > 4096) { const e = new Error('too large'); e.code = 'BODY_LIMIT'; throw e; } }
  return JSON.parse(value);
}
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.json':'application/json', '.png':'image/png', '.ico':'image/x-icon', '.woff2':'font/woff2' };
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    if (url.pathname === '/api/health' && request.method === 'GET') return json(response, 200, { status: 'ok' });
    if (url.pathname === '/api/targets' && request.method === 'GET') return json(response, 200, { targets });
    if (url.pathname === '/api/checks' && request.method === 'POST') {
      const origin = request.headers.origin;
      if (origin && origin !== (externalOrigin || url.origin)) return json(response, 403, { error: 'Checks must originate from this dashboard.' });
      if (Number(request.headers['content-length'] || 0) > 4096) { request.resume(); return json(response, 413, { error: 'Request is too large.' }); }
      let selected;
      try { const input = await body(request); selected = selectTargets(targets, input.ids); }
      catch (e) { return json(response, e.code === 'BODY_LIMIT' ? 413 : 400, { error: e.code === 'BODY_LIMIT' ? 'Request is too large.' : 'Send configured target IDs in a valid JSON object.' }); }
      return json(response, 200, { checks: await runProbeBatch(selected), source: 'http', checkedAt: Date.now() });
    }
    if (url.pathname.startsWith('/api/')) return json(response, 404, { error: 'API route not found.' });
    if (!['GET', 'HEAD'].includes(request.method)) return json(response, 405, { error: 'Method not allowed.' });
    let pathname;
    try { pathname = decodeURIComponent(url.pathname); } catch { return json(response, 400, { error: 'Invalid path.' }); }
    const candidate = path.resolve(dist, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (candidate !== dist && !candidate.startsWith(dist + path.sep)) return json(response, 403, { error: 'Invalid path.' });
    let file = candidate;
    try { const info = await fs.stat(file); if (!info.isFile()) throw new Error('not a file'); }
    catch { if (!path.extname(pathname) && (request.headers.accept || '').includes('text/html')) file = path.join(dist, 'index.html'); else return json(response, 404, { error: 'File not found. Run npm run build before npm start.' }); }
    let bytes;
    try { bytes = await fs.readFile(file); }
    catch { return json(response, 503, { error: 'Production bundle is missing. Run npm run build first.' }); }
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'X-Content-Type-Options':'nosniff', 'Cache-Control': file.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache' });
    response.end(request.method === 'HEAD' ? undefined : bytes);
  } catch { if (!response.headersSent) json(response, 500, { error: 'The request could not be completed.' }); else response.end(); }
});
server.requestTimeout = 20000;
server.headersTimeout = 10000;
server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `Port ${port} is in use. Stop the previous API process or change PORT / NETPULSE_API_PORT.` : 'NetPulse API failed to start.'); process.exitCode = 1; });
server.listen(port, host, () => console.log(`NetPulse API / production dashboard: http://${host}:${port}`));
process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
