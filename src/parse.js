// Parses raw log text into structured entries.
// Only explicitly supported formats are parsed; everything else is reported as skipped.

const LEVEL_ALIASES = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  WARNING: 'WARN',
  ERROR: 'ERROR',
  ERR: 'ERROR',
  FATAL: 'FATAL',
  CRITICAL: 'FATAL',
};

const TS = String.raw`\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?(?:Z|[+-]\d{2}:?\d{2})?`;
const TEXT_LINE = new RegExp(
  String.raw`^\s*(?:\[?(${TS})\]?\s+)?\[?(DEBUG|INFO|WARNING|WARN|ERROR|ERR|FATAL|CRITICAL)\]?(?:\s*:\s*|\s+|$)(.*)$`,
  'i'
);

export function normalizeLevel(raw) {
  if (typeof raw !== 'string') return null;
  return LEVEL_ALIASES[raw.trim().toUpperCase()] ?? null;
}

// Returns an ISO string, or null if the value is not a valid time.
// Timestamps without a timezone are treated as UTC so results are deterministic.
export function normalizeTimestamp(raw) {
  if (raw == null || raw === '') return null;
  let value = raw;
  if (typeof raw === 'number') {
    value = new Date(raw < 1e12 ? raw * 1000 : raw); // seconds or milliseconds
  } else if (typeof raw === 'string') {
    let s = raw.trim().replace(' ', 'T').replace(',', '.');
    s = s.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
    if (!/(Z|[+-]\d{2}:\d{2})$/.test(s)) s += 'Z';
    value = new Date(s);
  }
  const t = value instanceof Date ? value.getTime() : NaN;
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

function parseJsonLine(line) {
  let obj;
  try {
    obj = JSON.parse(line);
  } catch {
    return null;
  }
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return null;
  const level = normalizeLevel(obj.level ?? obj.severity ?? obj.lvl);
  const message = obj.message ?? obj.msg;
  if (!level || typeof message !== 'string') return null;
  return {
    timestamp: normalizeTimestamp(obj.timestamp ?? obj.time ?? obj.ts ?? obj['@timestamp']),
    level,
    message: message.trim(),
  };
}

export function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('{')) return parseJsonLine(trimmed);
  const m = TEXT_LINE.exec(line);
  if (!m) return null;
  const level = normalizeLevel(m[2]);
  if (!level) return null;
  return { timestamp: normalizeTimestamp(m[1]), level, message: m[3].trim() };
}

/**
 * @param {string} text raw file contents
 * @returns {{ entries: Array, skipped: Array<{line:number,text:string}>, totalLines: number }}
 */
export function parseLogs(text) {
  const lines = String(text).split(/\r?\n/);
  const entries = [];
  const skipped = [];
  lines.forEach((raw, i) => {
    if (!raw.trim()) return; // blank lines are not content
    const parsed = parseLine(raw);
    if (parsed) entries.push({ line: i + 1, ...parsed });
    else skipped.push({ line: i + 1, text: raw.length > 200 ? raw.slice(0, 200) + '…' : raw });
  });
  return { entries, skipped, totalLines: lines.filter((l) => l.trim()).length };
}