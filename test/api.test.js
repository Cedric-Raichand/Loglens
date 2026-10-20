import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createApp } from '../src/app.js';

const sample = await readFile(new URL('../samples/server.log', import.meta.url), 'utf8');

async function start(options) {
  const server = await new Promise((resolve) => {
    const s = createApp(options).listen(0, () => resolve(s));
  });
  after(() => {
    server.closeAllConnections?.();
    server.close();
  });
  return `http://127.0.0.1:${server.address().port}`;
}

function formWith(text, name = 'server.log', fields = {}) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  f.append('file', new Blob([text]), name);
  return f;
}

const post = (url, form) => fetch(`${url}/api/analyze`, { method: 'POST', body: form });

test('GET /api/health', async () => {
  const url = await start();
  const res = await fetch(`${url}/api/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok' });
});

test('POST /api/analyze returns the analysis for the sample log', async () => {
  const url = await start();
  const res = await post(url, formWith(sample, 'server.log', { bucketMinutes: '15' }));
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.file.name, 'server.log');
  assert.equal(data.parse.parsedEntries, 15);
  assert.equal(data.parse.skippedCount, 1);
  assert.equal(data.analysis.errorCount, 9);
  assert.equal(data.analysis.errorGroups[0].pattern, 'Database connection timeout');
  assert.equal(data.analysis.trend.peak.start, '2026-10-20T10:15:00.000Z');
  assert.equal(data.matches.total, 15);
});

test('filters affect matches but not the analysis', async () => {
  const url = await start();
  const res = await post(url, formWith(sample, 'server.log', { keyword: 'token', levels: 'error' }));
  const data = await res.json();
  assert.equal(data.matches.total, 2);
  assert.equal(data.analysis.totalEntries, 15);
});

test('limit truncates matches', async () => {
  const url = await start();
  const data = await (await post(url, formWith(sample, 'server.log', { limit: '3' }))).json();
  assert.equal(data.matches.entries.length, 3);
  assert.equal(data.matches.truncated, true);
});

test('missing file is a 400', async () => {
  const url = await start();
  const res = await post(url, new FormData());
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error.code, 'NO_FILE');
});

test('unsupported extension is a 400', async () => {
  const url = await start();
  const res = await post(url, formWith('echo hi', 'evil.sh'));
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error.code, 'UNSUPPORTED_FILE_TYPE');
});

test('binary content is rejected', async () => {
  const url = await start();
  const res = await post(url, formWith('abc\u0000def', 'fake.log'));
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error.code, 'NOT_TEXT');
});

test('oversized file is a 413', async () => {
  const url = await start({ maxFileBytes: 100 });
  const res = await post(url, formWith(sample));
  assert.equal(res.status, 413);
  assert.equal((await res.json()).error.code, 'LIMIT_FILE_SIZE');
});

test('bad options are 400s', async () => {
  const url = await start();
  for (const [field, value, code] of [
    ['bucketMinutes', '0', 'BAD_BUCKET'],
    ['levels', 'loud', 'BAD_LEVEL'],
    ['from', 'yesterday-ish', 'BAD_DATE'],
  ]) {
    const res = await post(url, formWith(sample, 'server.log', { [field]: value }));
    assert.equal(res.status, 400, field);
    assert.equal((await res.json()).error.code, code, field);
  }
});

test('unknown route is a JSON 404', async () => {
  const url = await start();
  const res = await fetch(`${url}/nope`);
  assert.equal(res.status, 404);
  assert.equal((await res.json()).error.code, 'NOT_FOUND');
});