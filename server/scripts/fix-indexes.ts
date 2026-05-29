#!/usr/bin/env tsx
/**
 * Convert Prisma-generated unique indexes on nullable fields to
 * partial-filter unique indexes. Required for MongoDB because Prisma's
 * default unique index treats every document with a missing/null value
 * as colliding, which breaks imports of the community roster (most
 * persons have no phone/email, most users have no personId, etc.).
 *
 * Run this once after every `prisma db push` (which would otherwise
 * regenerate the plain unique indexes).
 *
 * Spec: server/SAMAJ_CONNECT_SPEC.md §3 — Person.phone, Person.email,
 * User.email, User.personId, Household.headPersonId are all optional + unique.
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Target {
  collection: string;
  field: string;
  // $type expression to pick the field's MongoDB BSON type.
  bsonType: 'string' | 'objectId';
}

const TARGETS: Target[] = [
  { collection: 'Person', field: 'phone', bsonType: 'string' },
  { collection: 'Person', field: 'email', bsonType: 'string' },
  { collection: 'User', field: 'email', bsonType: 'string' },
  { collection: 'User', field: 'personId', bsonType: 'objectId' },
  { collection: 'Household', field: 'headPersonId', bsonType: 'objectId' },
];

function indexName(collection: string, field: string): string {
  return `${collection}_${field}_key`;
}

async function dropIfExists(collection: string, name: string): Promise<boolean> {
  try {
    await prisma.$runCommandRaw({ dropIndexes: collection, index: name });
    return true;
  } catch (e) {
    const msg = (e as Error).message ?? '';
    if (msg.includes('index not found')) return false;
    if (msg.includes('IndexNotFound')) return false;
    if (msg.includes('ns not found')) return false;
    if (msg.includes('NamespaceNotFound')) return false;
    // Re-throw anything unexpected.
    throw e;
  }
}

async function createPartialUnique(t: Target): Promise<void> {
  const name = indexName(t.collection, t.field);
  await prisma.$runCommandRaw({
    createIndexes: t.collection,
    indexes: [
      {
        key: { [t.field]: 1 },
        name,
        unique: true,
        partialFilterExpression: { [t.field]: { $type: t.bsonType } },
      },
    ],
  });
}

async function main() {
  for (const t of TARGETS) {
    const name = indexName(t.collection, t.field);
    const dropped = await dropIfExists(t.collection, name);
    await createPartialUnique(t);
    console.log(
      `[fix-indexes] ${dropped ? 'replaced' : 'created'} partial unique index ${name} ` +
        `(partialFilterExpression: { ${t.field}: { $type: "${t.bsonType}" } })`,
    );
  }
  console.log('[fix-indexes] done');
}

main()
  .catch((e) => {
    console.error('[fix-indexes] FAILED:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
