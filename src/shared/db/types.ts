import type { Prisma } from '../../generated/prisma/client';
/**
 * Either the root PrismaClient or a transaction client. PrismaClient is structurally
 * assignable to TransactionClient, so repositories work identically in both cases.
 */
export type Db = Prisma.TransactionClient;
/** Money travels as text (NFR1). Prisma.Decimal is accepted too. */
export type Money = string | Prisma.Decimal;
