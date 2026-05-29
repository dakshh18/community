import { env } from '../config/env';
import { log } from '../utils/logger';

interface FromAddress {
  email: string;
  name: string;
}

function parseFrom(): FromAddress {
  const m = env.EMAIL_FROM.match(/^(.*)<(.+)>\s*$/);
  if (m) return { name: m[1].trim() || 'Samaj Connect', email: m[2].trim() };
  return { name: 'Samaj Connect', email: env.EMAIL_FROM.trim() };
}

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  // In MOCK_OTP mode or when no API key is configured, just log.
  if (env.MOCK_OTP || !env.EMAIL_API_KEY) {
    log.info(`[MOCK_OTP] code for ${to}: ${code}`);
    return;
  }

  if (env.EMAIL_PROVIDER === 'brevo') {
    await sendViaBrevo(to, code);
    return;
  }
  if (env.EMAIL_PROVIDER === 'resend') {
    await sendViaResend(to, code);
    return;
  }
  throw new Error(`Unsupported EMAIL_PROVIDER: ${env.EMAIL_PROVIDER}`);
}

async function sendViaBrevo(to: string, code: string): Promise<void> {
  const from = parseFrom();
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': env.EMAIL_API_KEY,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { email: from.email, name: from.name },
      to: [{ email: to }],
      subject: `Samaj Connect login code: ${code}`,
      htmlContent: otpHtml(code),
      textContent: otpText(code),
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Brevo send failed: ${r.status} ${t}`);
  }
}

async function sendViaResend(to: string, code: string): Promise<void> {
  const from = parseFrom();
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.EMAIL_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: `${from.name} <${from.email}>`,
      to: [to],
      subject: `Samaj Connect login code: ${code}`,
      html: otpHtml(code),
      text: otpText(code),
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Resend send failed: ${r.status} ${t}`);
  }
}

function otpHtml(code: string): string {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:24px">
      <h2 style="margin:0 0 8px">Samaj Connect</h2>
      <p>Your one-time login code is:</p>
      <p style="font-size:32px;letter-spacing:8px;font-weight:700;text-align:center;
                background:#f4f4f5;border-radius:8px;padding:16px 0">${code}</p>
      <p style="color:#555">This code expires in ${env.OTP_TTL_MINUTES} minutes.</p>
      <p style="color:#888;font-size:12px">If you did not request this, you can ignore the email.</p>
    </div>
  `;
}

function otpText(code: string): string {
  return `Your Samaj Connect login code is ${code}. It expires in ${env.OTP_TTL_MINUTES} minutes.`;
}
