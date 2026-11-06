import type { PrismaClient } from '../generated/prisma/client';
import type { CreateBusinessWithOwnerInput } from './repositories/business-setup.repository';
import { createBusinessWithOwner } from './repositories/business-setup.repository';
import { AuditRepository } from './repositories/audit.repository';
import { BusinessRepository } from './repositories/business.repository';
import { CashOutRepository } from './repositories/cash-out.repository';
import { CashUpRepository } from './repositories/cash-up.repository';
import { CountEntryRepository } from './repositories/count-entry.repository';
import { JoinCodeRepository } from './repositories/join-code.repository';
import {
  redeemJoinCodeByHash,
  type RedeemJoinCodeResult,
} from './repositories/join-code.repository';
import { MembershipRepository } from './repositories/membership.repository';
import { RequestRepository } from './repositories/request.repository';
import { SaleRepository } from './repositories/sale.repository';
import type { Db, TenantScope } from './types';

/** All repositories for one business, sharing one connection or transaction. */
export interface RepositoryOptions {
  inTransaction?: boolean;
}

export interface Repositories {
  businesses: BusinessRepository;
  memberships: MembershipRepository;
  joinCodes: JoinCodeRepository;
  cashUps: CashUpRepository;
  sales: SaleRepository;
  cashOuts: CashOutRepository;
  counts: CountEntryRepository;
  audit: AuditRepository;
  requests: RequestRepository;
}

export function createRepositories(
  db: Db,
  scope: TenantScope,
  options?: RepositoryOptions,
): Repositories {
  return {
    businesses: new BusinessRepository(db, scope, options),
    memberships: new MembershipRepository(db, scope, options),
    joinCodes: new JoinCodeRepository(db, scope, options),
    cashUps: new CashUpRepository(db, scope, options),
    sales: new SaleRepository(db, scope, options),
    cashOuts: new CashOutRepository(db, scope, options),
    counts: new CountEntryRepository(db, scope, options),
    audit: new AuditRepository(db, scope, options),
    requests: new RequestRepository(db, scope, options),
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

  createBusinessWithOwner(input: CreateBusinessWithOwnerInput) {
    return createBusinessWithOwner(this.prisma, input);
  }

  redeemJoinCodeByHash(codeHash: string, userId: string): Promise<RedeemJoinCodeResult> {
    return redeemJoinCodeByHash(this.prisma, codeHash, userId);
  }

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
export {
  AuditAction,
  AuditEntityType,
  CashUpStatus,
  Currency,
  MembershipRole,
  MembershipStatus,
  PaymentMethod,
  SaleStatus,
} from '../generated/prisma/enums';
export { createBusinessWithOwner } from './repositories/business-setup.repository';
export type {
  CreateBusinessWithOwnerInput,
  CreateBusinessWithOwnerResult,
} from './repositories/business-setup.repository';
export type { CreateJoinCodeInput, RedeemJoinCodeResult } from './repositories/join-code.repository';
export type {
  AddMemberResult,
  MemberTransitionResult,
  ReplaceManagerResult,
} from './repositories/membership.repository';
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
