import { AsyncLocalStorage } from 'node:async_hooks';
import type { PrismaClient } from '../../src/generated/prisma/client';
import type { CurrentIdentity, CurrentMember } from '../../src/modules/auth/auth.types';

// Test fixtures only. Concurrent operations carry isolated mock boundary values.
export const serviceTestScope = new AsyncLocalStorage<{
  member?: CurrentMember;
  identity: CurrentIdentity;
  db?: PrismaClient;
}>();

export function withTestMember<T>(member: CurrentMember, db: PrismaClient | undefined, work: () => T): T {
  return serviceTestScope.run({ member, identity: member, db }, work);
}

export function withTestIdentity<T>(userId: string, db: PrismaClient | undefined, work: () => T): T {
  return serviceTestScope.run({ identity: { userId }, db }, work);
}

