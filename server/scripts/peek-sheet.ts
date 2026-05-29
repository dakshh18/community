#!/usr/bin/env tsx
/** Dump the first ~20 raw rows of a given sheet for debugging the importer. */
import 'dotenv/config';
import path from 'path';
import * as XLSX from 'xlsx';

const file = process.argv[2] ?? path.join('data', 'community.xlsx');
const sheetName = process.argv[3];
if (!sheetName) {
  console.error('usage: peek-sheet.ts <file> <sheetName>');
  process.exit(1);
}

const wb = XLSX.readFile(path.resolve(file), { cellDates: true });
const ws = wb.Sheets[sheetName];
if (!ws) {
  console.error(`sheet "${sheetName}" not found. Available:`);
  wb.SheetNames.forEach((n) => console.error(`  - "${n}"`));
  process.exit(1);
}

const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
  header: 1,
  defval: null,
  raw: true,
  blankrows: true,
});

console.log(`sheet: "${sheetName}" rows=${rows.length}`);
rows.slice(0, 25).forEach((r, i) => {
  const cells = (r ?? [])
    .slice(0, 11)
    .map((c) => (c == null ? '.' : JSON.stringify(c)))
    .join(' | ');
  console.log(`${String(i).padStart(3)}: ${cells}`);
});
