/** Pure monitoring rules shared by the UI and its tests. */
export const WINDOW_MS = { '1h': 3600000, '6h': 21600000, '24h': 86400000 };
export const STORAGE_KEY = 'netpulse.workspace.v1';
export const MAX_HISTORY = 2880;
export const SEED_TIME = Date.parse('2026-10-05T04:00:00Z');
export const STATUS_LABELS = { operational: 'Operational', degraded: 'Degraded', down: 'Down', unknown: 'Not checked' };

export function classifyCheck({ ok, latencyMs, thresholdMs = 500 }) {
  if (!ok) return 'down';
  return latencyMs > thresholdMs ? 'degraded' : 'operational';
}

export function availability(history = []) {
  const measured = history.filter(h => h.status !== 'unknown');
  return measured.length ? 100 * measured.filter(h => h.ok).length / measured.length : null;
}

export function averageLatency(history = []) {
  const values = history.filter(h => h.ok && Number.isFinite(h.latencyMs)).map(h => h.latencyMs);
  return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
}

export function inWindow(history, window, now) {
  return history.filter(h => h.at >= now - WINDOW_MS[window] && h.at <= now);
}

export function summarize(services, window = '24h', now = Date.now()) {
  const checks = services.flatMap(s => inWindow(s.history, window, now));
  return {
    total: services.length,
    healthy: services.filter(s => s.enabled && s.status === 'operational').length,
    degraded: services.filter(s => s.enabled && s.status === 'degraded').length,
    down: services.filter(s => s.enabled && s.status === 'down').length,
    availability: availability(checks),
    latency: averageLatency(checks),
    checks: checks.length,
  };
}

export function aggregateChart(services, window, now, buckets = 32) {
  const start = now - WINDOW_MS[window];
  const width = WINDOW_MS[window] / buckets;
  return Array.from({ length: buckets }, (_, i) => {
    const from = start + i * width;
    const to = from + width;
    const checks = services.flatMap(s => s.history.filter(h => h.at >= from && (i === buckets - 1 ? h.at <= to : h.at < to)));
    return { at: from + width / 2, latency: averageLatency(checks), availability: availability(checks), checks: checks.length };
  });
}

const DEMO_SERVICES = [
  ['api-gateway', 'API Gateway', 'https://api.netpulse.example/health', 'Core services', 'US East', 89, 'operational', 'gateway'],
  ['auth-service', 'Authentication', 'https://auth.netpulse.example/health', 'Core services', 'US East', 112, 'operational', 'lock'],
  ['edge-network', 'Edge Network', 'https://edge.netpulse.example/health', 'Infrastructure', 'Global', 42, 'operational', 'globe'],
  ['payment-api', 'Payment API', 'https://payments.netpulse.example/health', 'Core services', 'EU West', 648, 'degraded', 'credit'],
  ['dns-resolver', 'DNS Resolver', 'https://dns.netpulse.example/health', 'Infrastructure', 'AP South', 28, 'operational', 'network'],
  ['object-storage', 'Object Storage', 'https://storage.netpulse.example/health', 'Infrastructure', 'US West', 73, 'operational', 'database'],
  ['notification-worker', 'Notification Worker', 'https://notify.netpulse.example/health', 'Background jobs', 'EU West', null, 'down', 'mail'],
  ['search-api', 'Search API', 'https://search.netpulse.example/health', 'Core services', 'AP South', 535, 'degraded', 'search'],
];

export function createDemoWorkspace(now = SEED_TIME) {
  const services = DEMO_SERVICES.map(([id, name, url, group, region, baseline, status, icon], index) => {
    const history = Array.from({ length: 97 }, (_, j) => {
      const at = now - (96 - j) * 900000;
      const failed = (id === 'notification-worker' && j >= 95) || (id === 'payment-api' && j === 45) || (id === 'search-api' && j === 72);
      const slow = status === 'degraded' && j >= 88;
      const latencyMs = failed ? null : Math.max(10, Math.round((slow ? baseline : (baseline || 98) > 500 ? 150 : baseline || 98) + Math.sin(j * .8 + index) * 22 + Math.cos(j * .28) * 13));
      return { at, ok: !failed, latencyMs, status: classifyCheck({ ok: !failed, latencyMs, thresholdMs: 500 }), httpStatus: failed ? 503 : 200 };
    });
    const last = history.at(-1);
    return { id, name, url, group, region, icon, thresholdMs: 500, baseline: baseline || 98, enabled: true, status: last.status, latencyMs: last.latencyMs, lastChecked: now, history };
  });
  const incidents = [
    { id: 'INC-1042', serviceId: 'notification-worker', title: 'Notification Worker is unreachable', severity: 'critical', status: 'open', openedAt: now - 1800000, closedAt: null, notes: 'HTTP 503 received. Check worker health and upstream queue connectivity.', automatic: true },
    { id: 'INC-1041', serviceId: 'payment-api', title: 'Payment API response time is elevated', severity: 'warning', status: 'acknowledged', openedAt: now - 7200000, closedAt: null, notes: 'Response time exceeded the 500 ms threshold. Investigation in progress.', automatic: true },
    { id: 'INC-1040', serviceId: 'search-api', title: 'Search API response time is elevated', severity: 'warning', status: 'open', openedAt: now - 5400000, closedAt: null, notes: 'Review query latency and connection pool utilization.', automatic: true },
    { id: 'INC-1039', serviceId: 'api-gateway', title: 'API Gateway recovered', severity: 'warning', status: 'resolved', openedAt: now - 18000000, closedAt: now - 16500000, notes: 'Example incident from a previous investigation. Gateway is operational.', automatic: false },
  ];
  return { version: 1, mode: 'demo', services, incidents, updatedAt: now };
}

export function makeLiveWorkspace(targets, now = Date.now()) {
  return { version: 1, mode: 'live', updatedAt: now, incidents: [], services: targets.map(t => ({ ...t, group: t.group || 'HTTP endpoints', region: 'Probe location', icon: 'globe', enabled: true, status: 'unknown', latencyMs: null, lastChecked: null, history: [] })) };
}

export function applyChecks(workspace, checks, now = Date.now()) {
  const services = workspace.services.map(s => {
    const result = checks.find(c => c.id === s.id);
    if (!s.enabled || !result) return s;
    const sample = { at: result.checkedAt || now, ok: result.ok, latencyMs: result.latencyMs, httpStatus: result.httpStatus ?? null, status: classifyCheck({ ...result, thresholdMs: s.thresholdMs }) };
    // A cached HTTP batch is one observation; repeated clicks must not count it again.
    const previous = s.history.at(-1);
    if (previous && previous.at === sample.at && previous.ok === sample.ok && previous.latencyMs === sample.latencyMs && previous.httpStatus === sample.httpStatus) return s;
    return { ...s, status: sample.status, latencyMs: sample.latencyMs, error: result.error || null, lastChecked: sample.at, history: [...s.history, sample].slice(-MAX_HISTORY) };
  });
  let incidents = [...workspace.incidents];
  services.forEach(s => {
    if (!s.enabled || !checks.some(c => c.id === s.id)) return;
    const active = incidents.find(i => i.serviceId === s.id && i.status !== 'resolved');
    if (s.status === 'operational' && active?.automatic) {
      incidents = incidents.map(i => i.id === active.id ? { ...i, status: 'resolved', closedAt: now, notes: `${i.notes}\nRecovered after a successful check.` } : i);
    } else if ((s.status === 'down' || s.status === 'degraded') && !active) {
      incidents.unshift({ id: `INC-${now}-${s.id}`, serviceId: s.id, title: `${s.name} ${s.status === 'down' ? 'is unreachable' : 'response time is elevated'}`, severity: s.status === 'down' ? 'critical' : 'warning', status: 'open', openedAt: now, closedAt: null, notes: s.error || (s.status === 'down' ? `HTTP ${s.history.at(-1)?.httpStatus || 'check failed'}` : `Response time exceeded ${s.thresholdMs} ms.`), automatic: true });
    } else if (active && (s.status === 'down' || s.status === 'degraded')) {
      incidents = incidents.map(i => i.id === active.id ? { ...i, severity: s.status === 'down' ? 'critical' : 'warning', title: `${s.name} ${s.status === 'down' ? 'is unreachable' : 'response time is elevated'}` } : i);
    }
  });
  return { ...workspace, services, incidents: incidents.slice(0, 250), updatedAt: now };
}

export function demoChecks(services, now = Date.now()) {
  return services.filter(s => s.enabled).map((s, i) => ({ id: s.id, ok: s.id !== 'notification-worker', latencyMs: s.id === 'notification-worker' ? null : Math.max(10, Math.round(s.baseline + Math.sin(now / 30000 + i) * 18)), httpStatus: s.id === 'notification-worker' ? 503 : 200, checkedAt: now }));
}

export function validateDemoService(input) {
  const name = String(input.name || '').trim();
  if (name.length < 2 || name.length > 60) throw new Error('Use a service name between 2 and 60 characters.');
  let url;
  try { url = new URL(input.url); } catch { throw new Error('Enter a valid HTTPS endpoint.'); }
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Use an HTTPS endpoint without credentials.');
  const thresholdMs = Number(input.thresholdMs);
  if (!Number.isFinite(thresholdMs) || thresholdMs < 50 || thresholdMs > 10000) throw new Error('Threshold must be between 50 and 10,000 ms.');
  return { name, url: url.href, thresholdMs, group: String(input.group || 'Core services').slice(0, 40) };
}

export function servicesCsv(services, window, now) {
  const escape = value => {
    let text = String(value ?? '');
    if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  const rows = [['Service', 'Endpoint', 'Status', 'Latency (ms)', 'Availability (%)', 'Checks', 'Window', 'Last checked (UTC)'], ...services.map(s => {
    const history = inWindow(s.history, window, now);
    return [s.name, s.url, s.enabled ? STATUS_LABELS[s.status] : 'Paused', s.latencyMs ?? '', availability(history)?.toFixed(2) ?? '', history.length, window, s.lastChecked ? new Date(s.lastChecked).toISOString() : ''];
  })];
  return rows.map(r => r.map(escape).join(',')).join('\r\n');
}

export function readSavedWorkspace(raw, mode) {
  try {
    const data = JSON.parse(raw);
    if (data?.version !== 1 || data.mode !== mode || !Array.isArray(data.services) || !Array.isArray(data.incidents)) return null;
    if (data.services.length > 100 || data.incidents.length > 250 || !Number.isFinite(data.updatedAt)) return null;
    if (!data.services.every(s => typeof s.id === 'string' && typeof s.name === 'string' && typeof s.url === 'string' && typeof s.enabled === 'boolean' && Array.isArray(s.history) && s.history.length <= MAX_HISTORY && Object.hasOwn(STATUS_LABELS, s.status) && s.history.every(h => Number.isFinite(h.at) && typeof h.ok === 'boolean' && Object.hasOwn(STATUS_LABELS, h.status) && (h.latencyMs === null || Number.isFinite(h.latencyMs))))) return null;
    if (!data.incidents.every(i => typeof i.id === 'string' && typeof i.serviceId === 'string' && typeof i.title === 'string' && ['open', 'acknowledged', 'resolved'].includes(i.status) && Number.isFinite(i.openedAt))) return null;
    return data;
  } catch { return null; }
}
