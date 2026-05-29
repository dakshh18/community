/**
 * Settings service. Spec §4.2 (change email re-verify), §10 (PATCH /me/email),
 * §6 (privacy toggles on Person.showPhone / Person.showAddress).
 *
 * Email change is two-step:
 *   1. PATCH /me/email          → stores OtpCode for the NEW email + sends OTP
 *   2. POST  /me/email/verify   → confirms code, swaps Person.email + User.email
 */

import { z } from 'zod';

import { prisma } from '../db/prisma';
import { env } from '../config/env';
import { HttpError } from '../middleware/errorHandler';
import { generateOtpCode, hashOtp } from '../utils/otp';
import { sendOtpEmail } from './email';
import { audit } from '../utils/audit';
import { viewPerson, type ViewerCtx, type PersonView } from './privacy';

const OTP_RATE_LIMIT_PER_HOUR = 5;
const MAX_VERIFY_ATTEMPTS = 5;
const MOCK_CODE = '123456';
const emailSchema = z.string().trim().toLowerCase().email();

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(1, local.length - visible.length))}@${domain}`;
}

// ---------- Privacy toggles ----------

export interface PrivacyPatch {
  showPhone?: boolean;
  showAddress?: boolean;
}

export async function patchPrivacy(viewer: ViewerCtx, patch: PrivacyPatch): Promise<PersonView> {
  if (patch.showPhone === undefined && patch.showAddress === undefined) {
    throw new HttpError(400, 'no_changes', 'Provide showPhone and/or showAddress');
  }
  const updated = await prisma.person.update({
    where: { id: viewer.personId },
    data: {
      ...(patch.showPhone !== undefined ? { showPhone: patch.showPhone } : {}),
      ...(patch.showAddress !== undefined ? { showAddress: patch.showAddress } : {}),
    },
    include: {
      professionCat: true,
      household: { select: { nativePlace: true, city: true } },
    },
  });

  await audit({
    actorId: viewer.sub,
    action: 'privacy.update',
    entity: 'Person',
    entityId: viewer.personId,
    meta: patch,
  });

  return viewPerson(updated, updated.household, viewer);
}

// ---------- Email change ----------

export async function requestEmailChange(viewer: ViewerCtx, rawNewEmail: string) {
  const parsed = emailSchema.safeParse(rawNewEmail);
  if (!parsed.success) {
    throw new HttpError(400, 'invalid_email', 'Invalid email address');
  }
  const newEmail = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: viewer.sub } });
  if (!user) throw new HttpError(404, 'user_not_found', 'User not found');
  if (user.email && user.email === newEmail) {
    throw new HttpError(400, 'same_email', 'This is already your current email');
  }

  const conflict = await prisma.person.findUnique({ where: { email: newEmail } });
  if (conflict && conflict.id !== viewer.personId) {
    throw new HttpError(409, 'email_in_use', 'This email is already linked to another member');
  }

  if (!env.MOCK_OTP) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await prisma.otpCode.count({
      where: { phone: user.phone, createdAt: { gt: oneHourAgo } },
    });
    if (recent >= OTP_RATE_LIMIT_PER_HOUR) {
      throw new HttpError(429, 'rate_limited', 'Too many OTP requests. Try again in an hour.');
    }
  }

  const code = env.MOCK_OTP ? MOCK_CODE : generateOtpCode();
  const codeHash = hashOtp(code, user.phone);
  const expiresAt = new Date(Date.now() + env.OTP_TTL_MINUTES * 60 * 1000);

  await prisma.otpCode.create({
    data: { phone: user.phone, email: newEmail, codeHash, expiresAt },
  });

  await sendOtpEmail(newEmail, code);

  return {
    sent: true,
    maskedEmail: maskEmail(newEmail),
    expiresInMinutes: env.OTP_TTL_MINUTES,
    mock: env.MOCK_OTP,
  };
}

export async function verifyEmailChange(viewer: ViewerCtx, code: string) {
  const user = await prisma.user.findUnique({ where: { id: viewer.sub } });
  if (!user) throw new HttpError(404, 'user_not_found', 'User not found');

  // Find the most recent unconsumed OTP for this phone whose target email is
  // NOT the current one (i.e. it's an email-change request, not a login OTP).
  const otp = await prisma.otpCode.findFirst({
    where: {
      phone: user.phone,
      consumed: false,
      ...(user.email ? { email: { not: user.email } } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!otp) {
    throw new HttpError(400, 'no_pending_change', 'No pending email change. Request a new code.');
  }
  if (otp.expiresAt.getTime() < Date.now()) {
    throw new HttpError(400, 'otp_expired', 'Code expired. Request a new one.');
  }
  if (otp.attempts >= MAX_VERIFY_ATTEMPTS) {
    throw new HttpError(429, 'too_many_attempts', 'Too many wrong attempts. Request a new code.');
  }

  const expectedHash = hashOtp(code, user.phone);
  if (expectedHash !== otp.codeHash) {
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    throw new HttpError(401, 'invalid_code', 'Incorrect code');
  }

  const newEmail = otp.email;
  // Race guard: re-check the new email isn't taken in the window since request.
  const conflict = await prisma.person.findUnique({ where: { email: newEmail } });
  if (conflict && conflict.id !== viewer.personId) {
    throw new HttpError(409, 'email_in_use', 'This email is already linked to another member');
  }

  await prisma.$transaction([
    prisma.otpCode.update({ where: { id: otp.id }, data: { consumed: true } }),
    prisma.person.update({ where: { id: viewer.personId }, data: { email: newEmail } }),
    prisma.user.update({ where: { id: user.id }, data: { email: newEmail } }),
  ]);

  await audit({
    actorId: viewer.sub,
    action: 'email.change',
    entity: 'User',
    entityId: user.id,
    meta: { oldEmail: user.email, newEmail },
  });

  return { email: newEmail, maskedEmail: maskEmail(newEmail) };
}
