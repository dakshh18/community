// Phone normalization. Spec §1.5 + §4.1.
// Excel values come as floats (9428656090.0), with country code (+91, 91-),
// with spaces, or with a leading 0. We reduce to a canonical 10-digit Indian
// mobile and also expose an E.164 form.

const VALID_MOBILE = /^[6-9]\d{9}$/;

export function normalizePhone(input: unknown): string | null {
  if (input === null || input === undefined) return null;

  let s = typeof input === 'number' ? String(input) : String(input);
  s = s.trim();
  if (!s) return null;

  // strip trailing ".0" from Excel float repr
  if (s.endsWith('.0')) s = s.slice(0, -2);

  // keep only digits
  const digits = s.replace(/\D/g, '');
  if (!digits) return null;

  let core = digits;

  // drop India country code or leading 0
  if (core.length > 10 && core.startsWith('91')) {
    core = core.slice(-10);
  } else if (core.length === 11 && core.startsWith('0')) {
    core = core.slice(1);
  } else if (core.length > 10) {
    // last-resort: take final 10 digits
    core = core.slice(-10);
  }

  if (core.length !== 10) return null;
  if (!VALID_MOBILE.test(core)) return null;

  return core;
}

export function toE164India(canonical: string | null | undefined): string | null {
  if (!canonical) return null;
  if (!VALID_MOBILE.test(canonical)) return null;
  return `+91${canonical}`;
}

export function isValidIndianMobile(canonical: string | null | undefined): boolean {
  return !!canonical && VALID_MOBILE.test(canonical);
}
