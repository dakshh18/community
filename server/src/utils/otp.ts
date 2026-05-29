import crypto from 'crypto';

export function generateOtpCode(): string {
  const n = crypto.randomInt(0, 1_000_000);
  return n.toString().padStart(6, '0');
}

// Salt the hash with the phone so a leaked codeHash can't be reused across phones.
export function hashOtp(code: string, phone: string): string {
  return crypto.createHash('sha256').update(`${phone}:${code}`).digest('hex');
}
