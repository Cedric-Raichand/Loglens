export async function analyzeFile(file, { bucketMinutes, keyword, levels, limit } = {}) {
  const form = new FormData();
  if (bucketMinutes) form.append('bucketMinutes', String(bucketMinutes));
  if (keyword) form.append('keyword', keyword);
  if (levels && levels.length) form.append('levels', levels.join(','));
  if (limit) form.append('limit', String(limit));
  form.append('file', file); // keep the file last

  let res;
  try {
    res = await fetch('/api/analyze', { method: 'POST', body: form });
  } catch {
    throw new Error('Cannot reach the LogLens API. Is "npm start" running in the Loglens folder?');
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // response was not JSON; handled below
  }
  if (!res.ok) throw new Error(data?.error?.message ?? `Request failed (${res.status})`);
  return data;
}