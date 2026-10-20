import { toPattern } from './normalize.js';

export const LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
const ERROR_LEVELS = new Set(['ERROR', 'FATAL']);

const pct = (n, d) => (d === 0 ? 0 : Math.round((n / d) * 1000) / 10);

export function countLevels(entries) {
  const counts = Object.fromEntries(LEVELS.map((l) => [l, 0]));
  for (const e of entries) counts[e.level]++;
  return counts;
}

/** Group entries (of the given levels) by message pattern, most frequent first. */
export function groupMessages(entries, levels = ERROR_LEVELS) {
  const groups = new Map();
  let total = 0;
  for (const e of entries) {
    if (!levels.has(e.level)) continue;
    total++;
    const pattern = toPattern(e.message);
    const key = `${e.level}|${pattern}`;
    let g = groups.get(key);
    if (!g) {
      g = { level: e.level, pattern, count: 0, example: e.message, firstSeen: null, lastSeen: null, variants: 0, _seen: new Set() };
      groups.set(key, g);
    }
    g.count++;
    if (!g._seen.has(e.message)) {
      g._seen.add(e.message);
      g.variants++;
    }
    if (e.timestamp) {
      if (!g.firstSeen || e.timestamp < g.firstSeen) g.firstSeen = e.timestamp;
      if (!g.lastSeen || e.timestamp > g.lastSeen) g.lastSeen = e.timestamp;
    }
  }
  return [...groups.values()]
    .map(({ _seen, ...g }) => ({ ...g, share: pct(g.count, total) }))
    .sort((a, b) => b.count - a.count || a.pattern.localeCompare(b.pattern));
}

/** Count errors per time bucket. Entries without timestamps are excluded and counted separately. */
export function errorTimeline(entries, bucketMinutes = 60) {
  const size = bucketMinutes * 60_000;
  const buckets = new Map();
  let untimed = 0;
  for (const e of entries) {
    if (!ERROR_LEVELS.has(e.level)) continue;
    if (!e.timestamp) {
      untimed++;
      continue;
    }
    const start = Math.floor(Date.parse(e.timestamp) / size) * size;
    buckets.set(start, (buckets.get(start) ?? 0) + 1);
  }
  const timeline = [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([start, errors]) => ({ start: new Date(start).toISOString(), end: new Date(start + size).toISOString(), errors }));
  let peak = null;
  for (const b of timeline) if (!peak || b.errors > peak.errors) peak = b;
  return { bucketMinutes, timeline, peak, untimedErrors: untimed };
}

export function analyze(entries, { bucketMinutes = 60 } = {}) {
  const levels = countLevels(entries);
  const errorCount = levels.ERROR + levels.FATAL;
  const times = entries.map((e) => e.timestamp).filter(Boolean).sort();
  return {
    totalEntries: entries.length,
    levels,
    errorCount,
    warnCount: levels.WARN,
    timeRange: times.length ? { from: times[0], to: times[times.length - 1] } : null,
    errorGroups: groupMessages(entries, ERROR_LEVELS),
    warningGroups: groupMessages(entries, new Set(['WARN'])),
    trend: errorTimeline(entries, bucketMinutes),
  };
}