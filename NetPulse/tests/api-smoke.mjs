import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const port = 3197;
const origin = 'https://netpulse.test-host.example';
const env = {
  ...process.env,
  PORT: String(port),
  NETPULSE_API_PORT: '3198', // PORT must take precedence on hosting platforms.
  HOST: '127.0.0.1',
  RENDER_EXTERNAL_URL: origin,
};
delete env.NETPULSE_TARGETS_JSON;
const child = spawn(process.execPath, ['server/index.js'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
let errors = '';
child.stderr.on('data', chunk => { errors += chunk; });

try {
  const start = await Promise.race([
    once(child.stdout, 'data').then(() => true),
    once(child, 'exit').then(() => false),
  ]);
  assert.ok(start, `API server did not start: ${errors}`);
  const base = `http://127.0.0.1:${port}`;
  let response = await fetch(base + '/');
  assert.equal(response.status, 200);
  assert.match(await response.text(), /NetPulse/);

  response = await fetch(base + '/api/health');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });

  response = await fetch(base + '/api/targets');
  assert.equal(response.status, 200);
  const { targets } = await response.json();
  assert.equal(targets.length, 3);

  const headers = { 'Content-Type': 'application/json', Origin: origin };
  response = await fetch(base + '/api/checks', {
    method: 'POST', headers, body: JSON.stringify({ ids: ['unapproved'] }),
  });
  assert.equal(response.status, 400); // Trusted HTTPS origin passed the proxy check.

  response = await fetch(base + '/api/checks', {
    method: 'POST',
    headers: { ...headers, Origin: 'https://untrusted.example' },
    body: '{"ids":["example"]}',
  });
  assert.equal(response.status, 403);

  response = await fetch(base + '/api/checks', {
    method: 'POST', headers,
    body: JSON.stringify({ ids: ['example'], padding: 'x'.repeat(5000) }),
  });
  assert.equal(response.status, 413);

  response = await fetch(base + '/api/checks', {
    method: 'POST', headers, body: '{"ids":["example"]}',
  });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.source, 'http');
  assert.equal(data.checks.length, 1);
  assert.equal(data.checks[0].id, 'example');
  assert.equal(typeof data.checks[0].ok, 'boolean');
  assert.equal(typeof data.checks[0].checkedAt, 'number');

  console.log(JSON.stringify({
    api_checks: 'passed', production_html: 200, health: 200, platform_port: port,
    https_proxy_origin: 'accepted', target_count: targets.length,
    invalid_id: 400, cross_origin: 403, oversized_body: 413,
    real_http_record: data.checks[0],
  }));
} finally {
  if (child.exitCode === null && child.signalCode === null) {
    const stopped = once(child, 'exit');
    child.kill('SIGTERM');
    await stopped;
  }
}
