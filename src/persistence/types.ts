import type { Prisma } from '../generated/prisma/client';

/**
 * Either the root PrismaClient or a transaction client. PrismaClient is structurally
 * assignable to TransactionClient, so repositories work identically in both cases.
 */
export type Db = Prisma.TransactionClient;

/** The active business. Every repository is built for exactly one of these (NFR3 / NFR15). */
export interface TenantScope {
  businessId: string;
}

/** Money travels as text (NFR1). Prisma.Decimal is accepted too. */
export type Money = string | Prisma.Decimal;
