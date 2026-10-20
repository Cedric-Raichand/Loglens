const LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];

export default function UploadForm({ file, setFile, options, setOptions, onRun, loading }) {
  const set = (patch) => setOptions({ ...options, ...patch });

  function toggleLevel(level) {
    const has = options.levels.includes(level);
    set({ levels: has ? options.levels.filter((l) => l !== level) : [...options.levels, level] });
  }

  return (
    <section className="card">
      <div className="row">
        <label>
          Log file
          <input type="file" accept=".log,.txt,.json,.jsonl" onChange={(e) => setFile(e.target.files[0] ?? null)} />
        </label>
        <label>
          Trend window
          <select value={options.bucketMinutes} onChange={(e) => set({ bucketMinutes: Number(e.target.value) })}>
            <option value={5}>5 minutes</option>
            <option value={15}>15 minutes</option>
            <option value={60}>1 hour</option>
          </select>
        </label>
      </div>

      <div className="row">
        <label className="grow">
          Search messages
          <input
            type="text"
            placeholder="e.g. database"
            value={options.keyword}
            onChange={(e) => set({ keyword: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && onRun()}
          />
        </label>
        <fieldset>
          <legend>Levels (none = all)</legend>
          {LEVELS.map((l) => (
            <label key={l} className="inline">
              <input type="checkbox" checked={options.levels.includes(l)} onChange={() => toggleLevel(l)} /> {l}
            </label>
          ))}
        </fieldset>
      </div>

      <button onClick={onRun} disabled={loading}>
        {loading ? 'Analysing…' : file ? 'Analyse' : 'Choose a file first'}
      </button>
      {file && <span className="muted"> {file.name}</span>}
    </section>
  );
}