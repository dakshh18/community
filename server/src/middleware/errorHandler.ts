import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { log } from '../utils/logger';

export class HttpError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Express 4 detects error handlers by 4-argument signature, so `_next` must stay.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'validation_error',
      message: 'Request validation failed',
      issues: err.issues.map((i) => ({ path: i.path, message: i.message })),
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  log.error('unhandled error:', err);
  res.status(500).json({
    error: 'internal_error',
    message: 'Something went wrong',
  });
}
