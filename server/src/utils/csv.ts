/**
 * Tiny CSV serializer (no library). RFC-4180-ish escaping: any cell with a
 * comma, quote, or newline gets quoted, with internal quotes doubled.
 */

export function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  let s: string;
  if (v instanceof Date) s = v.toISOString();
  else if (typeof v === 'object') s = JSON.stringify(v);
  else s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function csv(header: string[], rows: unknown[][]): string {
  const headerLine = header.map(csvCell).join(',');
  const bodyLines = rows.map((r) => r.map(csvCell).join(','));
  // Prepend a UTF-8 BOM so Excel opens Gujarati cleanly.
  return '﻿' + [headerLine, ...bodyLines].join('\r\n') + '\r\n';
}
