// Turns a message into a pattern so "failed for user 102" and "failed for user 205" group together.
// Deliberately conservative: only replaces values that are clearly variable data,
// so unrelated problems are not merged.

const RULES = [
  [/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<uuid>'],
  [/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '<email>'],
  [/\b\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?\b/g, '<ip>'],
  [/\b0x[0-9a-f]+\b/gi, '<hex>'],
  [/\b[0-9a-f]{16,}\b/gi, '<hex>'],
  [/\b\d+(?:\.\d+)?\b/g, '<num>'],
];

export function toPattern(message) {
  let s = message.trim().replace(/\s+/g, ' ');
  for (const [re, token] of RULES) s = s.replace(re, token);
  return s;
}