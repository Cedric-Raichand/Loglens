import { useState } from 'react';
import { analyzeFile } from './api.js';
import UploadForm from './components/UploadForm.jsx';
import Summary from './components/Summary.jsx';
import ErrorGroups from './components/ErrorGroups.jsx';
import TrendChart from './components/TrendChart.jsx';
import MatchesTable from './components/MatchesTable.jsx';
import './App.css';

export default function App() {
  const [file, setFile] = useState(null);
  const [options, setOptions] = useState({ bucketMinutes: 15, keyword: '', levels: [] });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function run() {
    if (!file) {
      setError('Choose a log file first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      setResult(await analyzeFile(file, { ...options, limit: 200 }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app">
      <header>
        <h1>LogLens</h1>
        <p className="muted">Upload a log file to see what happened. Files are analysed in memory and not stored.</p>
      </header>

      <UploadForm file={file} setFile={setFile} options={options} setOptions={setOptions} onRun={run} loading={loading} />

      {error && <p className="error" role="alert">{error}</p>}

      {result && (
        <>
          <Summary result={result} />
          <ErrorGroups groups={result.analysis.errorGroups} />
          <TrendChart trend={result.analysis.trend} />
          <MatchesTable matches={result.matches} />
          <p className="muted note">
            LogLens shows what appears in the logs. It cannot confirm root cause, so treat these patterns as leads.
          </p>
        </>
      )}
    </main>
  );
}