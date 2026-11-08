import 'server-only';
import { getPrisma } from '../../shared/db/prisma';
import type { Db } from '../../shared/db/types';
import { NotInTransactionError } from '../../shared/errors/persistence-errors';
import type { CashOut } from '../../generated/prisma/client';
import { CashUpStatus } from '../../generated/prisma/enums';
import { DuplicateError, NotFoundError, StaleStateError, isUniqueViolation } from '../../shared/errors/persistence-errors';
import type { Money } from '../../shared/db/types';
import { CashUpRepository } from '../cash-ups/cash-ups.repository';
export type CashOutStatus = 'ACTIVE' | 'CANCELLED';
export interface CreateCashOutInput {
  cashUpId: string;
  amountUsd: Money;
  amountLbp: Money;
  note?: string | null;
  /** Required (FR28): the owner reviews every cash-out with its reason. */
  reason: string;
  idempotencyKey?: string | null;
  status?: CashOutStatus;
}
export interface CashOutChanges {
  amountUsd?: Money;
  amountLbp?: Money;
  note?: string | null;
  reason?: string;
}
export class CashOutRepository {
  constructor(private readonly businessId: string, private readonly db: Db = getPrisma()) {
    if (!businessId)
      throw new Error('A repository requires a businessId');
  }
  /** Records money taken from the drawer. Only while the cash-up is OPEN. Call in a transaction. */
  async create(input: CreateCashOutInput): Promise<{
    cashOut: CashOut;
    created: boolean;
  }> {
    await new CashUpRepository(this.businessId, this.db).lockOpenForUpdate(input.cashUpId);
    if (input.idempotencyKey) {
      const existing = await this.db.cashOut.findFirst({
        where: {
          cashUpId: input.cashUpId,
          idempotencyKey: input.idempotencyKey,
          cashUp: { businessId: this.businessId },
        },
      });
      if (existing)
        return { cashOut: existing, created: false };
    }
    try {
      const cashOut = await this.db.cashOut.create({
        data: {
          cashUpId: input.cashUpId,
          amountUsd: input.amountUsd,
          amountLbp: input.amountLbp,
          note: input.note ?? null,
          reason: input.reason,
          status: input.status ?? 'ACTIVE',
          idempotencyKey: input.idempotencyKey ?? null,
        },
      });
      return { cashOut, created: true };
    }
    catch (e) {
      if (isUniqueViolation(e))
        throw new DuplicateError('Cash-out');
      throw e;
    }
  }
  /**
   * Edits a cash-out while the cash-up is OPEN. Returns before and after so the service can
   * write the CASHOUT_EDITED audit entry with both values (FR28).
   */
  async update(id: string, changes: CashOutChanges): Promise<{
    before: CashOut;
    after: CashOut;
  }> {
    const beforeLock = await this.findById(id);
    if (!beforeLock)
      throw new NotFoundError('Cash-out');
    await new CashUpRepository(this.businessId, this.db).lockOpenForUpdate(beforeLock.cashUpId);
    const before = await this.findById(id);
    if (!before)
      throw new NotFoundError('Cash-out');
    const { count } = await this.db.cashOut.updateMany({
      where: { id, cashUp: { businessId: this.businessId, status: CashUpStatus.OPEN } },
      data: {
        ...(changes.amountUsd !== undefined ? { amountUsd: changes.amountUsd } : {}),
        ...(changes.amountLbp !== undefined ? { amountLbp: changes.amountLbp } : {}),
        ...(changes.note !== undefined ? { note: changes.note } : {}),
        ...(changes.reason !== undefined ? { reason: changes.reason } : {}),
      },
    });
    if (count === 0)
      throw new StaleStateError('Cash-out');
    const after = await this.findById(id);
    if (!after)
      throw new StaleStateError('Cash-out');
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
  async cancel(id: string, reason: string, cancelledByMembershipId: string): Promise<CashOut> {
    if (typeof Reflect.get(this.db, '$connect') === 'function')
      throw new NotInTransactionError();
    const beforeLock = await this.findById(id);
    if (!beforeLock)
      throw new NotFoundError('Cash-out');
    await new CashUpRepository(this.businessId, this.db).lockOpenForUpdate(beforeLock.cashUpId);
    const existing = await this.findById(id);
    if (!existing)
      throw new NotFoundError('Cash-out');
    if ((existing as {
      status?: CashOutStatus;
    }).status === 'CANCELLED') {
      throw new StaleStateError('Cash-out');
    }
    const updated = await this.db.cashOut.update({
      where: { id, cashUp: { businessId: this.businessId } },
      data: {
        status: 'CANCELLED',
        cancelReason: reason,
        cancelledAt: new Date(),
        cancelledByMembershipId,
      },
    });
    return updated;
  }
}
