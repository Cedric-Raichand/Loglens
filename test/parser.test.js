import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLine, parseLogs, normalizeLevel, normalizeTimestamp } from '../src/parser.js';

test('parses timestamp + level + message', () => {
  const e = parseLine('2026-10-20T10:16:00Z ERROR Database timeout');
  assert.deepEqual(e, { timestamp: '2026-10-20T10:16:00.000Z', level: 'ERROR', message: 'Database timeout' });
});

test('parses level-only lines with colon', () => {
  const e = parseLine('INFO: Server started on port 5000');
  assert.equal(e.level, 'INFO');
  assert.equal(e.timestamp, null);
  assert.equal(e.message, 'Server started on port 5000');
});

test('parses bracketed level and space-separated timestamp', () => {
  const e = parseLine('[2026-10-20 10:17:00] [WARN] Request took too long');
  assert.equal(e.level, 'WARN');
  assert.equal(e.timestamp, '2026-10-20T10:17:00.000Z');
});

test('normalizes level aliases', () => {
  assert.equal(normalizeLevel('warning'), 'WARN');
  assert.equal(normalizeLevel('err'), 'ERROR');
  assert.equal(normalizeLevel('critical'), 'FATAL');
  assert.equal(normalizeLevel('banana'), null);
});

test('does not mistake words that start with a level for a level', () => {
  assert.equal(parseLine('ERRORS were found in the build'), null);
  assert.equal(parseLine('INFORMATION is power'), null);
});

test('parses JSON lines with common field names', () => {
  const e = parseLine('{"time":"2026-10-20T10:18:00Z","severity":"error","msg":"Database connection refused"}');
  assert.deepEqual(e, { timestamp: '2026-10-20T10:18:00.000Z', level: 'ERROR', message: 'Database connection refused' });
});

test('rejects JSON without a usable level or message', () => {
  assert.equal(parseLine('{"foo":"bar"}'), null);
  assert.equal(parseLine('{"level":"info"}'), null);
  assert.equal(parseLine('{not json'), null);
});

test('timestamps: offsets, fractions, numbers, and garbage', () => {
  assert.equal(normalizeTimestamp('2026-10-20T10:00:00+0100'), '2026-10-20T09:00:00.000Z');
  assert.equal(normalizeTimestamp('2026-10-20 10:00:00,250'), '2026-10-20T10:00:00.250Z');
  assert.equal(normalizeTimestamp(1792490400), '2026-10-20T10:00:00.000Z');
  assert.equal(normalizeTimestamp('not a date'), null);
  assert.equal(normalizeTimestamp('2026-13-45T99:00:00Z'), null);
});

test('parseLogs reports skipped lines and ignores blanks', () => {
  const text = ['INFO Server started', '', '    at stack.trace (file.js:1)', 'ERROR Boom'].join('\n');
  const r = parseLogs(text);
  assert.equal(r.entries.length, 2);
  assert.equal(r.skipped.length, 1);
  assert.equal(r.skipped[0].line, 3);
  assert.equal(r.totalLines, 3);
});

test('parseLogs handles CRLF line endings', () => {
  const r = parseLogs('INFO a\r\nERROR b\r\n');
  assert.equal(r.entries.length, 2);
  assert.equal(r.entries[1].message, 'b');
});