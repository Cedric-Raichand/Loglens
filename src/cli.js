#!/usr/bin/env node
import { readFile, stat } from 'node:fs/promises';
import { analyzeText, formatReport } from './index.js';

const MAX_BYTES = 50 * 1024 * 1024; // Stage 1 reads files into memory; refuse huge inputs.

function usage() {
  console.error('Usage: loglens <file> [--json] [--bucket <minutes>]');
  process.exit(2);
}

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--bucket');
if (!file) usage();
const json = args.includes('--json');
const bi = args.indexOf('--bucket');
const bucketMinutes = bi === -1 ? 60 : Number(args[bi + 1]);
if (!Number.isInteger(bucketMinutes) || bucketMinutes < 1) {
  console.error('--bucket must be a positive whole number of minutes');
  process.exit(2);
}

try {
  const { size } = await stat(file);
  if (size > MAX_BYTES) throw new Error(`File is ${(size / 1048576).toFixed(1)} MB; limit is 50 MB in this version.`);
  const { analysis, skipped } = analyzeText(await readFile(file, 'utf8'), { bucketMinutes });
  console.log(json ? JSON.stringify({ analysis, skipped }, null, 2) : formatReport(analysis, { skipped }));
} catch (err) {
  console.error(`loglens: ${err.code === 'ENOENT' ? `file not found: ${file}` : err.message}`);
  process.exit(1);
}