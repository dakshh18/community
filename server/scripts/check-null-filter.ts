#!/usr/bin/env tsx
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  console.log('--- different null filters ---');
  console.log('total:                                ', await p.person.count());
  console.log('{ professionCatId: null }:             ', await p.person.count({ where: { professionCatId: null } }));
  console.log('{ professionCatId: { isSet: false } }: ', await p.person.count({ where: { professionCatId: { isSet: false } } }));
  console.log('OR null + isSet:false:                ', await p.person.count({
    where: { OR: [{ professionCatId: null }, { professionCatId: { isSet: false } }] },
  }));
  console.log('NOT (professionCatId: { not: null }): ', await p.person.count({ where: { NOT: { professionCatId: { not: null } } } }));
}
main().finally(() => p.$disconnect());
