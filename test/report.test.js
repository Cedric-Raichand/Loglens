import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { analyzeText, formatReport } from '../src/index.js';

const run = promisify(execFile);
const sample = await readFile(new URL('../samples/server.log', import.meta.url), 'utf8');

test('sample log: analysis and report', () => {
  const { analysis, skipped } = analyzeText(sample, { bucketMinutes: 15 });
  assert.equal(analysis.totalEntries, 15);
  assert.equal(skipped.length, 1); // the stack-trace line
  assert.equal(analysis.errorCount, 9);
  assert.equal(analysis.errorGroups[0].pattern, 'Database connection timeout');
  assert.equal(analysis.errorGroups[0].count, 6);
  assert.equal(analysis.trend.peak.start, '2026-10-20T10:15:00.000Z');
  const text = formatReport(analysis, { skipped });
  assert.match(text, /Database connection timeout/);
  assert.match(text, /cannot confirm root cause/);
});

test('report handles a log with no errors', () => {
  const { analysis } = analyzeText('INFO all good');
  assert.match(formatReport(analysis), /No errors found/);
  assert.match(formatReport(analysis), /No timestamped errors/);
});

test('cli prints a report and fails cleanly on a missing file', async () => {
  const ok = await run('node', ['src/cli.js', 'samples/server.log']);
  assert.match(ok.stdout, /Log Analysis Report/);
  await assert.rejects(run('node', ['src/cli.js', 'nope.log']), (e) => e.code === 1 && /file not found/.test(e.stderr));
});