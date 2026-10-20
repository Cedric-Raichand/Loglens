# LogLens

Helps developers understand application logs: how many errors occurred, which
are most frequent, when they started, and which deserve attention first.

**Status:** Stage 1 — log analysis engine (no UI yet, zero dependencies).

## Usage

```bash
node src/cli.js samples/server.log            # text report
node src/cli.js samples/server.log --json     # machine-readable
node src/cli.js samples/server.log --bucket 15  # 15-minute trend buckets
npm test
```

## Supported formats

- `TIMESTAMP LEVEL message` (e.g. `2026-10-20T10:15:00Z ERROR Database timeout`)
- `LEVEL: message` (no timestamp)
- JSON lines with `level`/`severity`, `message`/`msg`, `timestamp`/`time`/`ts`

Lines that match none of these are reported as skipped, never silently guessed.

## Principle

LogLens reports what the logs show. It does not claim root causes.
