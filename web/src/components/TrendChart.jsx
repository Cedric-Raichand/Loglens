const hhmm = (iso) => iso.slice(11, 16);

export default function TrendChart({ trend }) {
  const { timeline, peak, bucketMinutes, untimedErrors } = trend;
  const max = peak ? peak.errors : 1;

  return (
    <section className="card">
      <h2>Error trend</h2>
      {timeline.length === 0 ? (
        <p className="muted">No timestamped errors, so there is no trend to show.</p>
      ) : (
        <>
          <p className="muted">
            Errors per {bucketMinutes}-minute window (UTC). Windows with no errors are not shown.
          </p>
          <div className="chart">
            {timeline.map((b) => (
              <div className="col" key={b.start} title={`${b.start} to ${b.end}: ${b.errors} errors`}>
                <span className="col-count">{b.errors}</span>
                <div className={`col-bar ${b === peak ? 'peak' : ''}`} style={{ height: `${(b.errors / max) * 100}%` }} />
                <span className="col-label">{hhmm(b.start)}</span>
              </div>
            ))}
          </div>
          <p>
            Busiest window: <strong>{hhmm(peak.start)}–{hhmm(peak.end)}</strong> with {peak.errors} errors.
          </p>
        </>
      )}
      {untimedErrors > 0 && <p className="muted">{untimedErrors} error(s) had no timestamp and are not in the chart.</p>}
    </section>
  );
}