import { Prisma } from '../../generated/prisma/client';
import type { Sale } from '../../generated/prisma/client';
import { SaleStatus } from '../../generated/prisma/enums';
import type { Currency, PaymentMethod } from '../../generated/prisma/enums';
import { TenantRepository } from '../base.repository';
import { DuplicateError, NotFoundError, StaleStateError, isUniqueViolation } from '../errors';
import type { Money } from '../types';
import { CashUpRepository } from './cash-up.repository';

const ZERO = new Prisma.Decimal(0);

export interface CreateSaleInput {
  cashUpId: string;
  /** Created as DELIVERED ("paid now") or TO_DELIVER (FR7). */
  status: typeof SaleStatus.DELIVERED | typeof SaleStatus.TO_DELIVER;
  businessAmount: Money;
  deliveryFee: Money;
  tip?: Money | null;
  discount?: Money | null;
  /** What the customer handed over (for TO_DELIVER: the amount expected at the door). */
  totalCollected: Money;
  currency: Currency;
  method: PaymentMethod;
  changeGiven?: Money | null;
  changeCurrency?: Currency | null;
  clientNumber?: string | null;
  note?: string | null;
  /** Computed by the service: change currency differs from the payment currency (FR7). */
  mixedChange: boolean;
  /** Client-generated UUID so a double tap saves the sale once (NFR7). */
  idempotencyKey?: string | null;
}

/** Fields a person may edit while the cash-up is OPEN (FR9). Each change is logged. */
const EDITABLE_FIELDS = [
  'businessAmount',
  'deliveryFee',
  'tip',
  'discount',
  'totalCollected',
  'currency',
  'method',
  'changeGiven',
  'changeCurrency',
  'clientNumber',
  'note',
] as const;
export type EditableSaleField = (typeof EDITABLE_FIELDS)[number];
export type SaleChanges = Partial<Pick<CreateSaleInput, EditableSaleField>> & {
  /** Re-computed by the service after the edit. Not logged as an edit itself. */
  mixedChange?: boolean;
};

export interface ConfirmDeliveryInput {
  totalCollected: Money;
  currency: Currency;
  method: PaymentMethod;
  changeGiven?: Money | null;
  changeCurrency?: Currency | null;
  /** Collected amount / currency / method differs from the order (FR8). */
  amountDiffers: boolean;
  mixedChange: boolean;
}

export interface SaleListFilter {
  /** Defaults to TO_DELIVER + DELIVERED: deleted sales are hidden by default (FR11). */
  statuses?: SaleStatus[];
  clientNumber?: string;
}

export interface SaleTotalsRow {
  currency: Currency;
  method: PaymentMethod;
  count: number;
  businessAmount: Prisma.Decimal;
  deliveryFee: Prisma.Decimal;
  totalCollected: Prisma.Decimal;
  tip: Prisma.Decimal;
  discount: Prisma.Decimal;
}

export interface ChangeTotalsRow {
  currency: Currency;
  total: Prisma.Decimal;
}

export interface SaleFlagCounts {
  total: number;
  deleted: number;
  edited: number;
  amountDiffers: number;
  mixedChange: number;
  deletionAwaiting: number;
}

export class SaleRepository extends TenantRepository {
  // ---------------------------------------------------------------- create

  /**
   * Adds a sale to an OPEN cash-up: allocates the next sale number atomically, then inserts.
   * Call it inside a transaction. If the idempotency key was already used, the existing sale
   * is returned with `created: false` instead of a duplicate (NFR7).
   *
   * If two identical requests race past the lookup, the unique index rejects the second one as
   * a DuplicateError. That aborts its transaction, so the service should catch it and re-read
   * with `findByIdempotencyKey` outside the transaction.
   */
  async create(input: CreateSaleInput): Promise<{ sale: Sale; created: boolean }> {
     const cashUps = new CashUpRepository(this.db, this.scope, this.options);
     await cashUps.lockOpenForUpdate(input.cashUpId);

     if (input.idempotencyKey) {
       const existing = await this.findByIdempotencyKey(input.idempotencyKey);
       if (existing) return { sale: existing, created: false };
     }

     const saleNumber = await cashUps.nextSaleNumber(input.cashUpId);
    const delivered = input.status === SaleStatus.DELIVERED;

    try {
      const sale = await this.db.sale.create({
        data: {
          businessId: this.businessId,
          cashUpId: input.cashUpId,
          saleNumber,
          status: input.status,
          businessAmount: input.businessAmount,
          deliveryFee: input.deliveryFee,
          tip: input.tip ?? null,
          discount: input.discount ?? null,
          totalCollected: input.totalCollected,
          currency: input.currency,
          method: input.method,
          changeGiven: input.changeGiven ?? null,
          changeCurrency: input.changeCurrency ?? null,
          clientNumber: input.clientNumber ?? null,
          note: input.note ?? null,
          mixedChange: input.mixedChange,
          idempotencyKey: input.idempotencyKey ?? null,
          deliveredAt: delivered ? new Date() : null,
        },
      });
      return { sale, created: true };
    } catch (e) {
      if (isUniqueViolation(e)) throw new DuplicateError('Sale');
      throw e;
    }
  }

  // ----------------------------------------------------------------- reads

  findById(id: string) {
    return this.db.sale.findFirst({ where: { id, businessId: this.businessId } });
  }

  findByIdWithEdits(id: string) {
    return this.db.sale.findFirst({
      where: { id, businessId: this.businessId },
      include: { edits: { orderBy: { createdAt: 'asc' } } },
    });
  }

  findByIdempotencyKey(idempotencyKey: string) {
    return this.db.sale.findFirst({ where: { businessId: this.businessId, idempotencyKey } });
  }

  list(cashUpId: string, filter: SaleListFilter = {}) {
    return this.db.sale.findMany({
      where: this.listWhere(cashUpId, filter),
      orderBy: { saleNumber: 'asc' },
    });
  }

  // ------------------------------------------------------ guarded mutations
  //
  // All of these are `updateMany ... where <expected state>`; zero rows -> StaleStateError.
  // Staff-side changes also require the parent cash-up to still be OPEN, so a submitted or
  // approved cash-up cannot be touched even by a buggy service (NFR2).

  /**
   * FR9: edit a saved sale while the cash-up is open. Writes one SaleEdit row per changed
   * field (old and new value) and sets the "edited" marker. Call inside a transaction.
   * Sales that are deleted or locked for deletion cannot be edited.
   */
  async edit(id: string, changes: SaleChanges, editedById: string): Promise<Sale> {
    const current = await this.lockSaleForUpdate(id);
    if (current.status === SaleStatus.DELETED || current.deletionAwaiting) {
      throw new StaleStateError('Sale');
    }

    const data: Prisma.SaleUncheckedUpdateManyInput = {};
    const logs: Prisma.SaleEditCreateManyInput[] = [];

    for (const field of EDITABLE_FIELDS) {
      const next = changes[field];
      if (next === undefined) continue;
      const prev = current[field];
      if (sameValue(prev, next)) continue;
      (data as Record<string, unknown>)[field] = next;
      logs.push({
        saleId: id,
        editedById,
        field,
        oldValue: asText(prev),
        newValue: asText(next),
      });
    }

    if (changes.mixedChange !== undefined && changes.mixedChange !== current.mixedChange) {
      data.mixedChange = changes.mixedChange;
    }
    if (logs.length === 0) return current; // nothing actually changed

    data.isEdited = true;
    const { count } = await this.db.sale.updateMany({
      where: {
        id,
        businessId: this.businessId,
        status: { not: SaleStatus.DELETED },
        deletionAwaiting: false,
        cashUp: { status: 'OPEN' },
      },
      data,
    });
    if (count === 0) throw new StaleStateError('Sale');

    await this.db.saleEdit.createMany({ data: logs });
    return this.requireById(id);
  }

  /** FR8: TO_DELIVER -> DELIVERED, confirming amount, currency and method. */
  async markDelivered(id: string, confirm: ConfirmDeliveryInput): Promise<Sale> {
    await this.lockSaleForUpdate(id);
    const { count } = await this.db.sale.updateMany({
      where: {
        id,
        businessId: this.businessId,
        status: SaleStatus.TO_DELIVER,
        cashUp: { status: 'OPEN' },
      },
      data: {
        status: SaleStatus.DELIVERED,
        deliveredAt: new Date(),
        totalCollected: confirm.totalCollected,
        currency: confirm.currency,
        method: confirm.method,
        changeGiven: confirm.changeGiven ?? null,
        changeCurrency: confirm.changeCurrency ?? null,
        amountDiffers: confirm.amountDiffers,
        mixedChange: confirm.mixedChange,
      },
    });
    if (count === 0) throw new StaleStateError('Sale');
    return this.requireById(id);
  }

  /** FR10: cancel a TO_DELIVER sale with a reason, no approval needed. Final. */
  async cancelToDeliver(id: string, reason: string): Promise<Sale> {
    await this.lockSaleForUpdate(id);
    const { count } = await this.db.sale.updateMany({
      where: {
        id,
        businessId: this.businessId,
        status: SaleStatus.TO_DELIVER,
        cashUp: { status: 'OPEN' },
      },
      data: { status: SaleStatus.DELETED, deletedAt: new Date(), cancelReason: reason },
    });
    if (count === 0) throw new StaleStateError('Sale');
    return this.requireById(id);
  }

  /** FR16: lock a DELIVERED sale ("deletion awaiting owner") while its delete request is open. */
  async lockForDeletion(id: string): Promise<Sale> {
    await this.lockSaleForUpdate(id);
    const { count } = await this.db.sale.updateMany({
      where: {
        id,
        businessId: this.businessId,
        status: SaleStatus.DELIVERED,
        deletionAwaiting: false,
        cashUp: { status: 'OPEN' },
      },
      data: { deletionAwaiting: true },
    });
    if (count === 0) throw new StaleStateError('Sale');
    return this.requireById(id);
  }

  /** Request withdrawn or rejected: the sale becomes editable again. */
  async releaseDeletionLock(id: string): Promise<Sale> {
    await this.lockSaleForUpdate(id);
    const { count } = await this.db.sale.updateMany({
      where: {
        id,
        businessId: this.businessId,
        status: SaleStatus.DELIVERED,
        deletionAwaiting: true,
      },
      data: { deletionAwaiting: false },
    });
    if (count === 0) throw new StaleStateError('Sale');
    return this.requireById(id);
  }

  /** Request approved: DELIVERED (locked) -> DELETED. The row stays; nothing is removed. */
  async markDeleted(id: string): Promise<Sale> {
    await this.lockSaleForUpdate(id);
    const { count } = await this.db.sale.updateMany({
      where: {
        id,
        businessId: this.businessId,
        status: SaleStatus.DELIVERED,
        deletionAwaiting: true,
      },
      data: { status: SaleStatus.DELETED, deletedAt: new Date(), deletionAwaiting: false },
    });
    if (count === 0) throw new StaleStateError('Sale');
    return this.requireById(id);
  }

  // -------------------------------------------------------------- submit gate

  /** FR19: submit is allowed only when this is 0. */
  countAwaitingDelivery(cashUpId: string): Promise<number> {
    return this.db.sale.count({
      where: { cashUpId, businessId: this.businessId, status: SaleStatus.TO_DELIVER },
    });
  }

  // ----------------------------------------------------------- aggregates
  //
  // The database only sums. The expected-cash formula (FR14) lives in one pure domain
  // function so it can be unit-tested (NFR1).

  /** DELIVERED sales grouped by currency and method (cash vs Whish vs OMT). Feeds FR12 / FR14. */
  async totalsByCurrencyAndMethod(cashUpId: string): Promise<SaleTotalsRow[]> {
    const rows = await this.db.sale.groupBy({
      by: ['currency', 'method'],
      where: { cashUpId, businessId: this.businessId, status: SaleStatus.DELIVERED },
      _sum: {
        businessAmount: true,
        deliveryFee: true,
        totalCollected: true,
        tip: true,
        discount: true,
      },
      _count: { _all: true },
    });
    return rows.map((r) => ({
      currency: r.currency,
      method: r.method,
      count: r._count._all,
      businessAmount: r._sum.businessAmount ?? ZERO,
      deliveryFee: r._sum.deliveryFee ?? ZERO,
      totalCollected: r._sum.totalCollected ?? ZERO,
      tip: r._sum.tip ?? ZERO,
      discount: r._sum.discount ?? ZERO,
    }));
  }

  /** Change given on DELIVERED sales, grouped by the currency the change was paid in. */
  async changeGivenByCurrency(cashUpId: string): Promise<ChangeTotalsRow[]> {
    const rows = await this.db.sale.groupBy({
      by: ['changeCurrency'],
      where: {
        cashUpId,
        businessId: this.businessId,
        status: SaleStatus.DELIVERED,
        changeGiven: { not: null },
        changeCurrency: { not: null },
      },
      _sum: { changeGiven: true },
    });
    return rows.flatMap((r) =>
      r.changeCurrency ? [{ currency: r.changeCurrency, total: r._sum.changeGiven ?? ZERO }] : [],
    );
  }

  /** FR11: totals per currency for the current filter (e.g. one client number). */
  async totalsByCurrency(cashUpId: string, filter: SaleListFilter = {}) {
    const rows = await this.db.sale.groupBy({
      by: ['currency'],
      where: this.listWhere(cashUpId, filter),
      _sum: { totalCollected: true },
      _count: { _all: true },
    });
    return rows.map((r) => ({
      currency: r.currency,
      count: r._count._all,
      totalCollected: r._sum.totalCollected ?? ZERO,
    }));
  }

  /** FR20: counts behind the review flags, e.g. "3 of 12 sales deleted". */
  async flagCounts(cashUpId: string): Promise<SaleFlagCounts> {
    const base = { cashUpId, businessId: this.businessId };
    const [total, deleted, edited, amountDiffers, mixedChange, deletionAwaiting] = await Promise.all([
      this.db.sale.count({ where: base }),
      this.db.sale.count({ where: { ...base, status: SaleStatus.DELETED } }),
      this.db.sale.count({ where: { ...base, isEdited: true } }),
      this.db.sale.count({ where: { ...base, amountDiffers: true } }),
      this.db.sale.count({ where: { ...base, mixedChange: true } }),
      this.db.sale.count({ where: { ...base, deletionAwaiting: true } }),
    ]);
    return { total, deleted, edited, amountDiffers, mixedChange, deletionAwaiting };
  }

  // --------------------------------------------------------------- helpers

  private async lockSaleForUpdate(id: string): Promise<Sale> {
    const beforeLock = await this.findById(id);
    if (!beforeLock) throw new NotFoundError('Sale');

    await new CashUpRepository(this.db, this.scope, this.options).lockOpenForUpdate(
      beforeLock.cashUpId,
    );

    const sale = await this.findById(id);
    if (!sale) throw new NotFoundError('Sale');
    return sale;
  }

  private listWhere(cashUpId: string, filter: SaleListFilter): Prisma.SaleWhereInput {
    return {
      cashUpId,
      businessId: this.businessId,
      status: { in: filter.statuses ?? [SaleStatus.TO_DELIVER, SaleStatus.DELIVERED] },
      ...(filter.clientNumber ? { clientNumber: { contains: filter.clientNumber } } : {}),
    };
  }

  private async requireById(id: string): Promise<Sale> {
    const row = await this.findById(id);
    if (!row) throw new StaleStateError('Sale');
    return row;
  }
}

// -------------------------------------------------------------- edit-log helpers

function isDecimalLike(v: unknown): boolean {
  return v instanceof Prisma.Decimal;
}

function sameValue(prev: unknown, next: unknown): boolean {
  if (prev == null || next == null) return prev == null && next == null;
  // Money fields: compare numerically, so "10" and "10.00" are the same value.
  if (isDecimalLike(prev) || isDecimalLike(next)) {
    return new Prisma.Decimal(prev as Money).equals(new Prisma.Decimal(next as Money));
  }
  return prev === next;
}

function asText(v: unknown): string | null {
  return v == null ? null : String(v);
}
