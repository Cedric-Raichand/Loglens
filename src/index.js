import { parseLogs } from './parser.js';
import { analyze } from './analyzer.js';

export { parseLogs, parseLine } from './parser.js';
export { analyze, groupMessages, errorTimeline, countLevels } from './analyzer.js';
export { filterEntries } from './filter.js';
export { formatReport } from './report.js';

/** Convenience: raw text in, full analysis out. */
export function analyzeText(text, options) {
  const { entries, skipped, totalLines } = parseLogs(text);
  return { entries, skipped, totalLines, analysis: analyze(entries, options) };
}