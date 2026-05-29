/**
 * Lenient date-of-birth parser. Accepts:
 *   - ISO: 2007-08-18, 2007-08-18T00:00:00.000Z
 *   - dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy  (with 2 or 4-digit year)
 * Returns null for anything we can't confidently parse.
 */
export function parseDob(raw: unknown): Date | null {
  if (raw === null || raw === undefined) return null;
  if (raw instanceof Date) return isFinite(raw.getTime()) ? raw : null;

  const s = String(raw).trim();
  if (!s) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    return isFinite(d.getTime()) ? d : null;
  }

  const m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
  if (!m) return null;

  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  let year = parseInt(m[3], 10);
  if (year < 100) year += year >= 30 ? 1900 : 2000;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}
