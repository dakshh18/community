import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';

import { env } from '../config/env';
import { HttpError } from './errorHandler';

export interface AuthClaims {
  sub: string;        // User.id
  personId: string;
  householdId: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthClaims;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? '';
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) {
    next(new HttpError(401, 'unauthorized', 'Missing bearer token'));
    return;
  }
  try {
    const decoded = jwt.verify(m[1], env.JWT_SECRET);
    if (typeof decoded !== 'object' || decoded === null) {
      throw new Error('bad payload');
    }
    req.auth = decoded as AuthClaims;
    next();
  } catch {
    next(new HttpError(401, 'invalid_token', 'Invalid or expired token'));
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(new HttpError(401, 'unauthorized', 'Not authenticated'));
      return;
    }
    if (!roles.includes(req.auth.role)) {
      next(new HttpError(403, 'forbidden', 'Insufficient role'));
      return;
    }
    next();
  };
}
