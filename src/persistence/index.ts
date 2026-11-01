import type { PrismaClient } from '../generated/prisma/client';
import { AuditRepository } from './repositories/audit.repository';
import { CashOutRepository } from './repositories/cash-out.repository';
import { CashUpRepository } from './repositories/cash-up.repository';
import { CountEntryRepository } from './repositories/count-entry.repository';
import { MembershipRepository } from './repositories/membership.repository';
import { SaleRepository } from './repositories/sale.repository';
import type { Db, TenantScope } from './types';

/** All repositories for one business, sharing one connection or transaction. */
export interface RepositoryOptions {
  inTransaction?: boolean;
}

export interface Repositories {
  memberships: MembershipRepository;
  cashUps: CashUpRepository;
  sales: SaleRepository;
  cashOuts: CashOutRepository;
  counts: CountEntryRepository;
  audit: AuditRepository;
}

export function createRepositories(
  db: Db,
  scope: TenantScope,
  options?: RepositoryOptions,
): Repositories {
  return {
    memberships: new MembershipRepository(db, scope, options),
    cashUps: new CashUpRepository(db, scope, options),
    sales: new SaleRepository(db, scope, options),
    cashOuts: new CashOutRepository(db, scope, options),
    counts: new CountEntryRepository(db, scope, options),
    audit: new AuditRepository(db, scope, options),
  };
}

/**
 * The entry point services use. Business logic never touches PrismaClient directly:
 *
 *   await uow.run({ businessId }, async (r) => {
 *     const cashUp = await r.cashUps.open({ membershipId });
 *     await r.audit.append({ ... });          // same transaction as the change
 *   });
 */
export class UnitOfWork {
  constructor(private readonly prisma: PrismaClient) {}

  /** Plain reads, no transaction. */
  repos(scope: TenantScope): Repositories {
    return createRepositories(this.prisma, scope);
  }

  /** Everything inside commits together or not at all. */
  run<T>(scope: TenantScope, fn: (repos: Repositories) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(
      (tx) => fn(createRepositories(tx, scope, { inTransaction: true })),
      {
        maxWait: 5_000,
        timeout: 15_000,
      },
    );
  }
}

export * from './errors';
export * from './types';
export { createPrismaClient } from './prisma.client';
export type { OpenCashUpInput, CashUpSnapshot } from './repositories/cash-up.repository';
export type {
  CreateSaleInput,
  SaleChanges,
  ConfirmDeliveryInput,
  SaleListFilter,
  SaleTotalsRow,
  ChangeTotalsRow,
  SaleFlagCounts,
} from './repositories/sale.repository';
export type { CreateCashOutInput, CashOutChanges } from './repositories/cash-out.repository';
export type { CountLine } from './repositories/count-entry.repository';
export type { AuditEntry, AuditQuery } from './repositories/audit.repository';
