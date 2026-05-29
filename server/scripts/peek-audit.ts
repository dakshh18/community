#!/usr/bin/env tsx
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const limit = Number(process.argv[2] ?? 10);
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  for (const l of logs) {
    const meta = l.meta ? JSON.stringify(l.meta) : '';
    console.log(`${l.createdAt.toISOString()}  ${l.action.padEnd(22)} ${l.entity.padEnd(28)} ${l.entityId ?? ''}  ${meta.slice(0, 120)}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
