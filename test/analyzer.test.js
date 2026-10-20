import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLogs } from '../src/parser.js';
import { toPattern } from '../src/normalize.js';
import { analyze, groupMessages, errorTimeline, countLevels } from '../src/analyzer.js';
import { filterEntries } from '../src/filter.js';

const parse = (t) => parseLogs(t).entries;

test('spec example: counts by level and most frequent error', () => {
  const entries = parse('ERROR Database timeout\nINFO Server started\nERROR Database timeout\nWARN Slow request');
  const a = analyze(entries);
  assert.equal(a.totalEntries, 4);
  assert.equal(a.levels.ERROR, 2);
  assert.equal(a.levels.WARN, 1);
  assert.equal(a.levels.INFO, 1);
  assert.equal(a.errorGroups[0].pattern, 'Database timeout');
  assert.equal(a.errorGroups[0].count, 2);
});

test('groups six errors into two with correct share', () => {
  const entries = parse(
    ['Database timeout', 'Invalid token', 'Database timeout', 'Database timeout', 'Invalid token', 'Database timeout']
      .map((m) => 'ERROR ' + m)
      .join('\n')
  );
  const g = groupMessages(entries);
  assert.equal(g.length, 2);
  assert.deepEqual(g.map((x) => [x.pattern, x.count, x.share]), [
    ['Database timeout', 4, 66.7],
    ['Invalid token', 2, 33.3],
  ]);
});

test('merges messages that differ only by variable values', () => {
  const entries = parse('ERROR Request failed for user 102\nERROR Request failed for user 205\nERROR Request failed for user 318');
  const g = groupMessages(entries);
  assert.equal(g.length, 1);
  assert.equal(g[0].pattern, 'Request failed for user <num>');
  assert.equal(g[0].count, 3);
  assert.equal(g[0].variants, 3);
});

test('does not merge genuinely different messages', () => {
  const g = groupMessages(parse('ERROR Database timeout\nERROR Database connection refused\nFATAL Database timeout'));
  assert.equal(g.length, 3); // level is part of the group identity
});

test('normalizes uuids, ips, emails, and hex', () => {
  assert.equal(toPattern('conn from 10.0.0.5:5432 failed'), 'conn from <ip> failed');
  assert.equal(toPattern('user bob@example.com id 123e4567-e89b-12d3-a456-426614174000'), 'user <email> id <uuid>');
  assert.equal(toPattern('crash at 0xdeadbeef'), 'crash at <hex>');
});

test('tracks first and last seen per group', () => {
  const entries = parse('2026-10-20T10:20:00Z ERROR X\n2026-10-20T10:05:00Z ERROR X\n2026-10-20T10:10:00Z ERROR X');
  const [g] = groupMessages(entries);
  assert.equal(g.firstSeen, '2026-10-20T10:05:00.000Z');
  assert.equal(g.lastSeen, '2026-10-20T10:20:00.000Z');
});

test('timeline buckets errors and finds the peak', () => {
  const entries = parse(
    [
      '2026-10-20T10:01:00Z ERROR a',
      '2026-10-20T10:16:00Z ERROR a',
      '2026-10-20T10:17:00Z ERROR a',
      '2026-10-20T10:18:00Z FATAL b',
      '2026-10-20T10:19:00Z INFO ignored',
      'ERROR no timestamp',
    ].join('\n')
  );
  const t = errorTimeline(entries, 15);
  assert.equal(t.timeline.length, 2);
  assert.equal(t.peak.start, '2026-10-20T10:15:00.000Z');
  assert.equal(t.peak.errors, 3);
  assert.equal(t.untimedErrors, 1);
});

test('empty input is handled', () => {
  const a = analyze([]);
  assert.equal(a.totalEntries, 0);
  assert.equal(a.timeRange, null);
  assert.equal(a.trend.peak, null);
  assert.deepEqual(countLevels([]), { DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0, FATAL: 0 });
});

test('filter by keyword, level, and time', () => {
  const entries = parse(
    [
      '2026-10-20T10:16:00Z ERROR Database timeout',
      '2026-10-20T10:18:00Z ERROR Database connection refused',
      '2026-10-20T10:21:00Z WARN Database response was slow',
      '2026-10-20T10:22:00Z ERROR Invalid token',
    ].join('\n')
  );
  assert.equal(filterEntries(entries, { keyword: 'DATABASE' }).length, 3);
  assert.equal(filterEntries(entries, { keyword: 'database', levels: ['error'] }).length, 2);
  assert.equal(filterEntries(entries, { from: '2026-10-20T10:20:00Z' }).length, 2);
  assert.throws(() => filterEntries(entries, { from: 'nope' }), RangeError);
});