const fmt = (n) => n.toLocaleString('en-US');

function Stat({ label, value, tone }) {
  return (
    <div className={`stat ${tone ?? ''}`}>
      <div className="stat-value">{value}</div>
      <div className="muted">{label}</div>
    </div>
  );
}

export default function Summary({ result }) {
  const { analysis, parse } = result;
  return (
    <section className="card">
      <h2>Summary</h2>
      <div className="stats">
        <Stat label="Log entries" value={fmt(analysis.totalEntries)} />
        <Stat label="Errors" value={fmt(analysis.errorCount)} tone="bad" />
        <Stat label="Warnings" value={fmt(analysis.warnCount)} tone="warn" />
        <Stat label="Skipped lines" value={fmt(parse.skippedCount)} />
      </div>
      {analysis.timeRange && (
        <p className="muted">
          {analysis.timeRange.from} to {analysis.timeRange.to} (UTC)
        </p>
      )}
      {parse.skippedCount > 0 && (
        <p className="muted">
          {parse.skippedCount} line(s) did not match a supported format, first at line {parse.skippedSample[0].line}.
        </p>
      )}
    </section>
  );
}