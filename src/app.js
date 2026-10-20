import path from 'node:path';
import express from 'express';
import multer from 'multer';
import { parseLogs, analyze, filterEntries } from './index.js';
import { normalizeLevel } from './parser.js';

const ALLOWED_EXTENSIONS = new Set(['.log', '.txt', '.json', '.jsonl']);
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024; // 5 MB: files are held in memory in this stage

class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function parseBucket(value) {
  if (value === undefined || value === '') return 60;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 1440) {
    throw new HttpError(400, 'BAD_BUCKET', 'bucketMinutes must be a whole number from 1 to 1440.');
  }
  return n;
}

function parseLevels(value) {
  if (!value) return undefined;
  const levels = String(value).split(',').map((s) => s.trim()).filter(Boolean);
  const normalized = levels.map(normalizeLevel);
  if (normalized.some((l) => l === null)) {
    throw new HttpError(400, 'BAD_LEVEL', 'levels must be a comma-separated list of DEBUG, INFO, WARN, ERROR, FATAL.');
  }
  return normalized;
}

function parseLimit(value) {
  if (value === undefined || value === '') return 100;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) throw new HttpError(400, 'BAD_LIMIT', 'limit must be a positive whole number.');
  return Math.min(n, 500);
}

export function createApp({
  maxFileBytes = DEFAULT_MAX_BYTES,
  corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173',
} = {}) {
  const app = express();
  app.disable('x-powered-by');

  // Minimal CORS so the React dev server can call this API later.
  app.use((req, res, next) => {
    res.set('Access-Control-Allow-Origin', corsOrigin);
    res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  // Uploads stay in memory and are never written to disk, so nothing is retained.
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxFileBytes, files: 1 },
    fileFilter(req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        return cb(new HttpError(400, 'UNSUPPORTED_FILE_TYPE', `Unsupported file type "${ext || '(none)'}". Use .log, .txt, .json or .jsonl.`));
      }
      cb(null, true);
    },
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // POST multipart/form-data: file (required), bucketMinutes, keyword, levels, from, to, limit
  app.post('/api/analyze', upload.single('file'), (req, res) => {
    if (!req.file) throw new HttpError(400, 'NO_FILE', 'Upload a log file in the "file" field.');
    if (req.file.buffer.includes(0)) {
      throw new HttpError(400, 'NOT_TEXT', 'That looks like a binary file, not a text log.');
    }

    const body = req.body ?? {};
    const bucketMinutes = parseBucket(body.bucketMinutes);
    const levels = parseLevels(body.levels);
    const limit = parseLimit(body.limit);

    const { entries, skipped, totalLines } = parseLogs(req.file.buffer.toString('utf8'));

    let matches;
    try {
      matches = filterEntries(entries, { levels, keyword: body.keyword, from: body.from, to: body.to });
    } catch (err) {
      if (err instanceof RangeError) throw new HttpError(400, 'BAD_DATE', err.message);
      throw err;
    }

    res.json({
      file: { name: path.basename(req.file.originalname), sizeBytes: req.file.size },
      parse: {
        totalLines,
        parsedEntries: entries.length,
        skippedCount: skipped.length,
        skippedSample: skipped.slice(0, 20),
      },
      // The analysis always covers the whole file; filters only affect "matches".
      analysis: analyze(entries, { bucketMinutes }),
      matches: {
        total: matches.length,
        truncated: matches.length > limit,
        entries: matches.slice(0, limit),
      },
    });
  });

  app.use((req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No such route.' } });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      const tooBig = err.code === 'LIMIT_FILE_SIZE';
      return res.status(tooBig ? 413 : 400).json({
        error: {
          code: err.code,
          message: tooBig ? `File is too large. The limit is ${Math.floor(maxFileBytes / 1024)} KB.` : err.message,
        },
      });
    }
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: { code: err.code, message: err.message } });
    }
    console.error(err); // details stay in the server log, not in the response
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong analysing that file.' } });
  });

  return app;
}