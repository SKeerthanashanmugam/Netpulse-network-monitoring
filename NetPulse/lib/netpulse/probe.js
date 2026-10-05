/** Server-only HTTP probes. The browser sends IDs, never arbitrary URLs. */
export const DEFAULT_TARGETS = [
  { id: 'example', name: 'Example Website', url: 'https://example.com/', group: 'Public endpoints', thresholdMs: 1500 },
  { id: 'cloudflare', name: 'Cloudflare Trace', url: 'https://www.cloudflare.com/cdn-cgi/trace', group: 'Public endpoints', thresholdMs: 1500 },
  { id: 'wikipedia', name: 'Wikipedia', url: 'https://www.wikipedia.org/', group: 'Public endpoints', thresholdMs: 1500 },
];

export function parseTargets(raw) {
  const source = raw ? JSON.parse(raw) : DEFAULT_TARGETS;
  if (!Array.isArray(source) || source.length === 0 || source.length > 12) throw new Error('Configure 1 to 12 HTTP targets.');
  const ids = new Set();
  return source.map(t => {
    const url = new URL(t.url);
    const hostname = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || hostname === 'localhost' || /\.(local|internal|localhost|test)$/.test(hostname) || !hostname.includes('.') || /^\d+\.\d+\.\d+\.\d+$/.test(hostname) || hostname.includes(':')) throw new Error('Configured targets must be trusted public HTTPS hostnames.');
    if (!/^[a-z][a-z0-9-]{0,39}$/.test(t.id) || ids.has(t.id)) throw new Error('Use unique target IDs with lowercase letters, numbers, and hyphens.');
    ids.add(t.id);
    const thresholdMs = Number(t.thresholdMs ?? 1500);
    if (!Number.isFinite(thresholdMs) || thresholdMs < 50 || thresholdMs > 10000) throw new Error('Invalid latency threshold.');
    return { id: t.id, name: String(t.name || t.id).slice(0, 60), url: url.href, group: String(t.group || 'HTTP endpoints').slice(0, 40), thresholdMs };
  });
}

export function selectTargets(targets, ids) {
  if (!Array.isArray(ids) || !ids.length || ids.length > 12 || !ids.every(id => typeof id === 'string')) throw new Error('Send 1 to 12 target IDs.');
  const unique = [...new Set(ids)];
  const selected = unique.map(id => targets.find(t => t.id === id));
  if (selected.some(t => !t)) throw new Error('Unknown target ID.');
  return selected;
}

export async function probeTarget(target, { fetchImpl = fetch, timeoutMs = 5000, now = () => performance.now() } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = now();
  try {
    const response = await fetchImpl(target.url, { method: 'GET', redirect: 'manual', signal: controller.signal, headers: { 'Accept': '*/*', 'User-Agent': 'NetPulse-Learning-Project/1.0' } });
    const latencyMs = Math.max(1, Math.round(now() - start));
    if (response.body) await response.body.cancel().catch(() => {});
    return { id: target.id, ok: response.status >= 200 && response.status < 300, latencyMs, httpStatus: response.status, checkedAt: Date.now(), error: response.status >= 300 && response.status < 400 ? 'Redirect received. Configure the final HTTPS URL.' : response.status >= 400 ? `HTTP ${response.status}` : null };
  } catch {
    return { id: target.id, ok: false, latencyMs: null, httpStatus: null, checkedAt: Date.now(), error: controller.signal.aborted ? 'Check timed out after 5 seconds.' : 'Endpoint could not be reached from the probe server.' };
  } finally { clearTimeout(timer); }
}

// A small best-effort cache coalesces repeated clicks within a Worker isolate.
// This is not a durable global rate limiter or a background scheduler.
let cache = null;
export async function runProbeBatch(targets) {
  const key = JSON.stringify(targets.map(t => [t.id, t.url, t.thresholdMs]));
  if (cache?.key === key && Date.now() - cache.at < 10000) return cache.promise;
  const promise = Promise.all(targets.map(t => probeTarget(t)));
  cache = { key, at: Date.now(), promise };
  return promise;
}
