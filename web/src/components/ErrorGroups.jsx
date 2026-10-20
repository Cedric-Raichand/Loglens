export default function ErrorGroups({ groups }) {
  return (
    <section className="card">
      <h2>Recurring errors</h2>
      {groups.length === 0 && <p className="muted">No errors found.</p>}
      <ol className="groups">
        {groups.map((g) => (
          <li key={`${g.level}|${g.pattern}`}>
            <div className="group-head">
              <span className="pattern">
                <span className={`badge ${g.level}`}>{g.level}</span> {g.pattern}
              </span>
              <strong>
                {g.count} <span className="muted">({g.share}%)</span>
              </strong>
            </div>
            <div className="bar">
              <div className="bar-fill" style={{ width: `${g.share}%` }} />
            </div>
            {g.firstSeen && (
              <div className="muted small">
                first {g.firstSeen} · last {g.lastSeen}
                {g.variants > 1 ? ` · ${g.variants} variants` : ''}
              </div>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}