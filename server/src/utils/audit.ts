import type { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { log } from './logger';

/**
 * Write an AuditLog entry. Fire-and-forget — if persistence fails we log and
 * carry on, since we'd rather complete the user-facing request than 500.
 *
 * `meta` is typed as `unknown` for convenience at call sites (the caller can
 * pass a plain record); we narrow to Prisma's JSON type at the boundary.
 */
export async function audit(opts: {
  actorId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  meta?: unknown;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: opts.actorId,
        action: opts.action,
        entity: opts.entity,
        entityId: opts.entityId ?? undefined,
        meta: (opts.meta ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (e) {
    log.warn('audit log write failed:', (e as Error).message);
  }
}
