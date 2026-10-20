const fmt = (n) => n.toLocaleString('en-US');

/** Plain-text investigation report. States observations only; never asserts a root cause. */
export function formatReport(analysis, { skipped = [], topN = 5 } = {}) {
  const a = analysis;
  const out = [];
  out.push('Log Analysis Report', '===================');
  out.push(`Total log entries: ${fmt(a.totalEntries)}`);
  if (a.timeRange) out.push(`Time range: ${a.timeRange.from} to ${a.timeRange.to}`);
  out.push(`Errors: ${fmt(a.errorCount)} (ERROR ${a.levels.ERROR}, FATAL ${a.levels.FATAL})`);
  out.push(`Warnings: ${fmt(a.warnCount)}`);
  out.push(`Info: ${fmt(a.levels.INFO)}   Debug: ${fmt(a.levels.DEBUG)}`);
  if (skipped.length) out.push(`Unparsed lines skipped: ${fmt(skipped.length)} (first at line ${skipped[0].line})`);

  out.push('', 'Most frequent errors', '--------------------');
  if (!a.errorGroups.length) out.push('No errors found.');
  a.errorGroups.slice(0, topN).forEach((g, i) => {
    out.push(`${i + 1}. [${g.level}] ${g.pattern}`);
    out.push(`   ${fmt(g.count)} occurrence${g.count === 1 ? "" : "s"} (${g.share}% of errors)` + (g.variants > 1 ? `, ${g.variants} distinct variants` : ''));
    if (g.firstSeen) out.push(`   first seen ${g.firstSeen}, last seen ${g.lastSeen}`);
  });
  if (a.errorGroups.length > topN) out.push(`... and ${a.errorGroups.length - topN} more error pattern(s)`);

  if (a.warningGroups.length) {
    out.push('', 'Most frequent warnings', '----------------------');
    a.warningGroups.slice(0, 3).forEach((g, i) => out.push(`${i + 1}. ${g.pattern} — ${fmt(g.count)}`));
  }

  const { peak, bucketMinutes, untimedErrors, timeline } = a.trend;
  out.push('', 'Error trend', '-----------');
  if (peak) {
    const timed = a.errorCount - untimedErrors;
    out.push(`Busiest ${bucketMinutes}-minute window: ${peak.start} to ${peak.end} with ${fmt(peak.errors)} errors`);
    out.push(`(${Math.round((peak.errors / Math.max(timed, 1)) * 100)}% of timestamped errors across ${timeline.length} active window(s))`);
  } else {
    out.push('No timestamped errors, so no trend could be computed.');
  }
  if (untimedErrors) out.push(`${fmt(untimedErrors)} error(s) had no timestamp and are excluded from the trend.`);

  out.push('', 'Note: this report describes what appears in the logs. It cannot confirm root cause;', 'treat the patterns above as leads to investigate.');
  return out.join('\n');
}