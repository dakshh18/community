import type { Request, Response, NextFunction } from 'express';

export function notFound(req: Request, res: Response, _next: NextFunction): void {
  res.status(404).json({
    error: 'not_found',
    message: `Route ${req.method} ${req.originalUrl} does not exist`,
  });
}
