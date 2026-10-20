export default function MatchesTable({ matches }) {
  return (
    <section className="card">
      <h2>Matching log lines</h2>
      <p className="muted">
        {matches.total} match(es){matches.truncated ? `, showing the first ${matches.entries.length}` : ''}.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Line</th>
              <th>Time (UTC)</th>
              <th>Level</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            {matches.entries.map((e) => (
              <tr key={e.line}>
                <td>{e.line}</td>
                <td>{e.timestamp ? e.timestamp.slice(11, 19) : '–'}</td>
                <td>
                  <span className={`badge ${e.level}`}>{e.level}</span>
                </td>
                <td>{e.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}