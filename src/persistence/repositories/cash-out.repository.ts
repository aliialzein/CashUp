import type { CashOut } from '../../generated/prisma/client';
import { CashUpStatus } from '../../generated/prisma/enums';
import type { Currency } from '../../generated/prisma/enums';
import { TenantRepository } from '../base.repository';
import { DuplicateError, NotFoundError, StaleStateError, isUniqueViolation } from '../errors';
import type { Money } from '../types';
import { CashUpRepository } from './cash-up.repository';

export type CashOutStatus = 'ACTIVE' | 'CANCELLED';

export interface CreateCashOutInput {
  cashUpId: string;
  amount: Money;
  currency: Currency;
  /** Required (FR28): the owner reviews every cash-out with its reason. */
  reason: string;
  idempotencyKey?: string | null;
  status?: CashOutStatus;
}

export interface CashOutChanges {
  amount?: Money;
  currency?: Currency;
  reason?: string;
}

export class CashOutRepository extends TenantRepository {
  /** Records money taken from the drawer. Only while the cash-up is OPEN. Call in a transaction. */
  async create(input: CreateCashOutInput): Promise<{ cashOut: CashOut; created: boolean }> {
    await new CashUpRepository(this.db, this.scope, this.options).lockOpenForUpdate(input.cashUpId);

    if (input.idempotencyKey) {
      const existing = await this.db.cashOut.findFirst({
        where: {
          cashUpId: input.cashUpId,
          idempotencyKey: input.idempotencyKey,
          cashUp: { businessId: this.businessId },
        },
      });
      if (existing) return { cashOut: existing, created: false };
    }

    try {
      const cashOut = await this.db.cashOut.create({
        data: {
          cashUpId: input.cashUpId,
          amount: input.amount,
          currency: input.currency,
          reason: input.reason,
          status: input.status ?? 'ACTIVE',
          idempotencyKey: input.idempotencyKey ?? null,
        } as never,
      });
      return { cashOut, created: true };
    } catch (e) {
      if (isUniqueViolation(e)) throw new DuplicateError('Cash-out');
      throw e;
    }
  }

  /**
   * Edits a cash-out while the cash-up is OPEN. Returns before and after so the service can
   * write the CASHOUT_EDITED audit entry with both values (FR28).
   */
  async update(id: string, changes: CashOutChanges): Promise<{ before: CashOut; after: CashOut }> {
    const beforeLock = await this.findById(id);
    if (!beforeLock) throw new NotFoundError('Cash-out');

    await new CashUpRepository(this.db, this.scope, this.options).lockOpenForUpdate(
      beforeLock.cashUpId,
    );

    const before = await this.findById(id);
    if (!before) throw new NotFoundError('Cash-out');

    const { count } = await this.db.cashOut.updateMany({
      where: { id, cashUp: { businessId: this.businessId, status: CashUpStatus.OPEN } },
      data: {
        ...(changes.amount !== undefined ? { amount: changes.amount } : {}),
        ...(changes.currency !== undefined ? { currency: changes.currency } : {}),
        ...(changes.reason !== undefined ? { reason: changes.reason } : {}),
      },
    });
    if (count === 0) throw new StaleStateError('Cash-out');

    const after = await this.findById(id);
    if (!after) throw new StaleStateError('Cash-out');
    return { before, after };
  }

  findById(id: string) {
    return this.db.cashOut.findFirst({
      where: { id, cashUp: { businessId: this.businessId } },
    });
  }

  listByCashUp(cashUpId: string) {
    return this.db.cashOut.findMany({
      where: { cashUpId, cashUp: { businessId: this.businessId } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async cancel(
    id: string,
    reason: string,
    cancelledByMembershipId: string,
  ): Promise<CashOut> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundError('Cash-out');
    if ((existing as { status?: CashOutStatus }).status === 'CANCELLED') {
      throw new StaleStateError('Cash-out');
    }

    const updated = await this.db.cashOut.update({
      where: { id, cashUp: { businessId: this.businessId } },
      data: {
        status: 'CANCELLED',
        cancelReason: reason,
        cancelledAt: new Date(),
        cancelledByMembershipId,
      } as never,
    });
    return updated;
  }

}
