/** Filter entries by level(s), keyword (case-insensitive), and time range (ISO strings). */
export function filterEntries(entries, { levels, keyword, from, to } = {}) {
  const wanted = levels?.length ? new Set(levels.map((l) => l.toUpperCase())) : null;
  const kw = keyword ? keyword.toLowerCase() : null;
  const fromMs = from ? Date.parse(from) : null;
  const toMs = to ? Date.parse(to) : null;
  if ((from && Number.isNaN(fromMs)) || (to && Number.isNaN(toMs))) {
    throw new RangeError('Invalid date in filter: from/to must be ISO timestamps');
  }
  return entries.filter((e) => {
    if (wanted && !wanted.has(e.level)) return false;
    if (kw && !e.message.toLowerCase().includes(kw)) return false;
    if (fromMs !== null || toMs !== null) {
      if (!e.timestamp) return false; // cannot place it in the range
      const t = Date.parse(e.timestamp);
      if (fromMs !== null && t < fromMs) return false;
      if (toMs !== null && t > toMs) return false;
    }
    return true;
  });
}