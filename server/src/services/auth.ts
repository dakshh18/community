import jwt, { type SignOptions } from 'jsonwebtoken';
import { z } from 'zod';

import { prisma } from '../db/prisma';
import { env } from '../config/env';
import { normalizePhone, toE164India } from '../utils/phone';
import { generateOtpCode, hashOtp } from '../utils/otp';
import { sendOtpEmail } from './email';
import { HttpError } from '../middleware/errorHandler';

const MOCK_CODE = '123456';
const OTP_RATE_LIMIT_PER_HOUR = 5;
const MAX_VERIFY_ATTEMPTS = 5;

const emailSchema = z.string().trim().toLowerCase().email();

export async function authStart(rawPhone: string) {
  const phone = normalizePhone(rawPhone);
  if (!phone) throw new HttpError(400, 'invalid_phone', 'Invalid phone number');

  const person = await prisma.person.findUnique({ where: { phone } });
  if (!person) return { found: false as const, needsEmail: false };

  return {
    found: true as const,
    needsEmail: !person.email,
    maskedEmail: person.email ? maskEmail(person.email) : null,
  };
}

export async function sendOtp(rawPhone: string, suppliedEmail: string | undefined) {
  const phone = normalizePhone(rawPhone);
  if (!phone) throw new HttpError(400, 'invalid_phone', 'Invalid phone number');

  const person = await prisma.person.findUnique({ where: { phone } });
  if (!person) {
    throw new HttpError(
      404,
      'not_registered',
      "Your number isn't in community records. Please contact the committee.",
    );
  }

  let email = person.email;

  if (!email) {
    if (!suppliedEmail) {
      throw new HttpError(400, 'email_required', 'Please provide your email address');
    }
    const parsed = emailSchema.safeParse(suppliedEmail);
    if (!parsed.success) {
      throw new HttpError(400, 'invalid_email', 'Invalid email address');
    }
    const candidate = parsed.data;
    const conflict = await prisma.person.findUnique({ where: { email: candidate } });
    if (conflict && conflict.id !== person.id) {
      throw new HttpError(409, 'email_in_use', 'This email is already linked to another member');
    }
    await prisma.person.update({ where: { id: person.id }, data: { email: candidate } });
    email = candidate;
  } else if (suppliedEmail && suppliedEmail.trim().toLowerCase() !== email) {
    throw new HttpError(
      409,
      'email_mismatch',
      'A different email is on file. Use the change-email flow to update it.',
    );
  }

  if (!env.MOCK_OTP) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await prisma.otpCode.count({
      where: { phone, createdAt: { gt: oneHourAgo } },
    });
    if (recent >= OTP_RATE_LIMIT_PER_HOUR) {
      throw new HttpError(429, 'rate_limited', 'Too many OTP requests. Try again in an hour.');
    }
  }

  const code = env.MOCK_OTP ? MOCK_CODE : generateOtpCode();
  const codeHash = hashOtp(code, phone);
  const expiresAt = new Date(Date.now() + env.OTP_TTL_MINUTES * 60 * 1000);

  await prisma.otpCode.create({
    data: { phone, email, codeHash, expiresAt },
  });

  await sendOtpEmail(email, code);

  return {
    sent: true,
    maskedEmail: maskEmail(email),
    expiresInMinutes: env.OTP_TTL_MINUTES,
    mock: env.MOCK_OTP,
  };
}

export async function verifyOtp(rawPhone: string, code: string) {
  const phone = normalizePhone(rawPhone);
  if (!phone) throw new HttpError(400, 'invalid_phone', 'Invalid phone number');

  const person = await prisma.person.findUnique({ where: { phone } });
  if (!person) {
    throw new HttpError(404, 'not_registered', 'Number is not in community records');
  }

  const otp = await prisma.otpCode.findFirst({
    where: { phone, consumed: false },
    orderBy: { createdAt: 'desc' },
  });
  if (!otp) throw new HttpError(400, 'no_otp', 'No active code. Please request a new one.');
  if (otp.expiresAt.getTime() < Date.now()) {
    throw new HttpError(400, 'otp_expired', 'Code has expired. Please request a new one.');
  }
  if (otp.attempts >= MAX_VERIFY_ATTEMPTS) {
    throw new HttpError(
      429,
      'too_many_attempts',
      'Too many wrong attempts. Please request a new code.',
    );
  }

  const expectedHash = hashOtp(code, phone);
  if (expectedHash !== otp.codeHash) {
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    throw new HttpError(401, 'invalid_code', 'Incorrect code');
  }

  await prisma.otpCode.update({
    where: { id: otp.id },
    data: { consumed: true },
  });

  if (!person.email) {
    // Defensive: send-otp guarantees an email, but in case the row was modified.
    throw new HttpError(500, 'missing_email', 'No email on file for this person');
  }

  const user = await prisma.user.upsert({
    where: { phone },
    create: {
      phone,
      email: person.email,
      personId: person.id,
      role: 'MEMBER',
      lastLoginAt: new Date(),
    },
    update: {
      email: person.email,
      personId: person.id,
      lastLoginAt: new Date(),
    },
  });

  const signOptions: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  };
  const token = jwt.sign(
    {
      sub: user.id,
      personId: person.id,
      householdId: person.householdId,
      role: user.role,
    },
    env.JWT_SECRET,
    signOptions,
  );

  return {
    token,
    user: {
      id: user.id,
      role: user.role,
      phone: toE164India(phone),
      email: user.email,
    },
    personId: person.id,
    householdId: person.householdId,
  };
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(1, local.length - visible.length))}@${domain}`;
}
