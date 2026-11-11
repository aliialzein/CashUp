import 'server-only';
import { getPrisma } from '../../shared/db/prisma';
import type { Db } from '../../shared/db/types';
import { Prisma } from '../../generated/prisma/client';
import type { Request, Sale } from '../../generated/prisma/client';
import { SaleStatus } from '../../generated/prisma/enums';
import type { Currency, PaymentMethod } from '../../generated/prisma/enums';
import { DuplicateError, NotFoundError, StaleStateError, isUniqueViolation } from '../../shared/errors/persistence-errors';
import type { Money } from '../../shared/db/types';
import { CashUpRepository } from '../cash-ups/cash-ups.repository';
const ZERO = new Prisma.Decimal(0);
export interface CreateSaleInput {
  cashUpId: string;
  /** Created as DELIVERED ("paid now") or TO_DELIVER (FR7). */
  status: typeof SaleStatus.DELIVERED | typeof SaleStatus.TO_DELIVER;
  businessAmountUsd: Money;
  businessAmountLbp: Money;
  deliveryFeeUsd: Money;
  deliveryFeeLbp: Money;
  tipUsd: Money | null;
  tipLbp: Money | null;
  discountUsd: Money;
  discountLbp: Money;
  totalCollectedUsd: Money | null;
  totalCollectedLbp: Money | null;
  changeGivenUsd: Money | null;
  changeGivenLbp: Money | null;
  method: PaymentMethod | null;
  clientNumber?: string | null;
  note?: string | null;
  /** Client-generated UUID so a double tap saves the sale once (NFR7). */
  idempotencyKey?: string | null;
}
/** Fields a person may edit on a pending sale while the cash-up is OPEN (FR9). Each change is logged. */
const EDITABLE_FIELDS = [
  'businessAmountUsd',
  'businessAmountLbp',
  'deliveryFeeUsd',
  'deliveryFeeLbp',
  'tipUsd',
  'tipLbp',
  'discountUsd',
  'discountLbp',
  'totalCollectedUsd',
  'totalCollectedLbp',
  'changeGivenUsd',
  'changeGivenLbp',
  'method', 'clientNumber', 'note',
] as const;
export type EditableSaleField = (typeof EDITABLE_FIELDS)[number];
export type SaleChanges = Partial<Pick<CreateSaleInput, EditableSaleField>>;
export interface ConfirmDeliveryInput {
  deliveryFeeUsd: Money;
  deliveryFeeLbp: Money;
  tipUsd: Money;
  tipLbp: Money;
  totalCollectedUsd: Money;
  totalCollectedLbp: Money;
  changeGivenUsd: Money;
  changeGivenLbp: Money;
  method: PaymentMethod;
  amountDiffers: boolean;
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
  deletionAwaiting: number;
}
export interface SaleStatusCounts {
  total: number;
  delivered: number;
  toDeliver: number;
  deleted: number;
}
/** Named persistence record used by service comparisons. */
export type SaleRecord = Sale;
export class SaleRepository {
  /** Existing history can disprove an unchanged creation; it cannot reconstruct every original command. */
  async hasReplayChanges(saleId: string): Promise<boolean> {
    const [edits, mutations] = await Promise.all([
      this.db.saleEdit.count({ where: { saleId, sale: { businessId: this.businessId } } }),
      this.db.auditLog.count({ where: { businessId: this.businessId, entityType: 'SALE', entityId: saleId, action: { in: ['SALE_DELIVERED', 'SALE_CANCELLED'] } } }),
    ]);
    return edits > 0 || mutations > 0;
  }
  constructor(private readonly businessId: string, private readonly db: Db = getPrisma()) {
    if (!businessId)
      throw new Error('A repository requires a businessId');
  }
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
  async create(input: CreateSaleInput): Promise<{
    sale: Sale;
    created: boolean;
  }> {
    const cashUps = new CashUpRepository(this.businessId, this.db);
    await cashUps.lockOpenForUpdate(input.cashUpId);
    if (input.idempotencyKey) {
      const existing = await this.findByIdempotencyKey(input.idempotencyKey);
      if (existing)
        return { sale: existing, created: false };
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
          businessAmountUsd: input.businessAmountUsd,
          businessAmountLbp: input.businessAmountLbp,
          deliveryFeeUsd: input.deliveryFeeUsd,
          deliveryFeeLbp: input.deliveryFeeLbp,
          tipUsd: input.tipUsd,
          tipLbp: input.tipLbp,
          discountUsd: input.discountUsd,
          discountLbp: input.discountLbp,
          totalCollectedUsd: input.totalCollectedUsd,
          totalCollectedLbp: input.totalCollectedLbp,
          changeGivenUsd: input.changeGivenUsd,
          changeGivenLbp: input.changeGivenLbp,
          method: input.method,
          clientNumber: input.clientNumber ?? null,
          note: input.note ?? null,
          idempotencyKey: input.idempotencyKey ?? null,
          deliveredAt: delivered ? new Date() : null,
        },
      });
      return { sale, created: true };
    }
    catch (e) {
      if (isUniqueViolation(e))
        throw new DuplicateError('Sale');
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
   * Only pending sales can be edited; delivered, deleted or deletion-locked sales are ineligible.
   */
  async edit(id: string, changes: SaleChanges, editedById: string): Promise<Sale> {
    const current = await this.lockSaleForUpdate(id);
    if (current.status !== SaleStatus.TO_DELIVER || current.deletionAwaiting) {
      throw new StaleStateError('Sale');
    }
    const data: Prisma.SaleUncheckedUpdateManyInput = {};
    const logs: Prisma.SaleEditCreateManyInput[] = [];
    for (const field of EDITABLE_FIELDS) {
      const next = changes[field];
      if (next === undefined)
        continue;
      const prev = current[field];
      if (sameValue(prev, next))
        continue;
      (data as Record<string, unknown>)[field] = next;
      logs.push({
        saleId: id,
        editedById,
        field,
        oldValue: asText(prev, field.endsWith('Usd') || field.endsWith('Lbp')),
        newValue: asText(next, field.endsWith('Usd') || field.endsWith('Lbp')),
      });
    }
    if (logs.length === 0)
      return current; // nothing actually changed
    data.isEdited = true;
    const { count } = await this.db.sale.updateMany({
      where: {
        id,
        businessId: this.businessId,
        status: SaleStatus.TO_DELIVER,
        deletionAwaiting: false,
        cashUp: { status: 'OPEN' },
      },
      data,
    });
    if (count === 0)
      throw new StaleStateError('Sale');
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
        deliveryFeeUsd: confirm.deliveryFeeUsd,
        deliveryFeeLbp: confirm.deliveryFeeLbp,
        tipUsd: confirm.tipUsd,
        tipLbp: confirm.tipLbp,
        totalCollectedUsd: confirm.totalCollectedUsd,
        totalCollectedLbp: confirm.totalCollectedLbp,
        changeGivenUsd: confirm.changeGivenUsd,
        changeGivenLbp: confirm.changeGivenLbp,
        method: confirm.method,
        amountDiffers: confirm.amountDiffers,
      },
    });
    if (count === 0)
      throw new StaleStateError('Sale');
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
    if (count === 0)
      throw new StaleStateError('Sale');
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
    if (count === 0)
      throw new StaleStateError('Sale');
    return this.requireById(id);
  }
  /** Request withdrawn or rejected: clear the request flag; delivered edits remain forbidden. */
  async releaseDeletionLock(id: string): Promise<Sale> {
    await this.lockSaleForUpdate(id);
    const { count } = await this.db.sale.updateMany({
      where: {
        id,
        businessId: this.businessId,
        status: SaleStatus.DELIVERED,
        deletionAwaiting: true,
        cashUp: { status: 'OPEN' },
      },
      data: { deletionAwaiting: false },
    });
    if (count === 0)
      throw new StaleStateError('Sale');
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
        cashUp: { status: 'OPEN' },
      },
      data: { status: SaleStatus.DELETED, deletedAt: new Date(), deletionAwaiting: false },
    });
    if (count === 0)
      throw new StaleStateError('Sale');
    return this.requireById(id);
  }
  findDeletionRequest(id: string): Promise<Request | null> {
    return this.db.request.findFirst({ where: { id, businessId: this.businessId, type: 'DELETE_SALE' } });
  }
  listDeletionRequests(cashUpId: string): Promise<Request[]> {
    return this.db.request.findMany({
      where: { businessId: this.businessId, cashUpId, type: 'DELETE_SALE' },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }
  async createDeletionRequest(cashUpId: string, saleId: string, requestedById: string, reason: string): Promise<Request> {
    return this.db.request.create({ data: {
      businessId: this.businessId, cashUpId, saleId, requestedById, reason, type: 'DELETE_SALE',
    } });
  }
  async decideDeletionRequest(id: string, approved: boolean, decidedById: string, decisionReason: string, selfApproved: boolean): Promise<Request> {
    const { count } = await this.db.request.updateMany({
      where: { id, businessId: this.businessId, type: 'DELETE_SALE', status: 'AWAITING_OWNER', cashUp: { status: 'OPEN' } },
      data: { status: approved ? 'APPROVED' : 'REJECTED', decidedById, decisionReason, selfApproved, decidedAt: new Date() },
    });
    if (count !== 1) throw new StaleStateError('Request');
    const request = await this.findDeletionRequest(id);
    if (!request) throw new NotFoundError('Request');
    return request;
  }
  // -------------------------------------------------------------- submit gate
  /** FR19: submit is allowed only when this is 0. */
  countAwaitingDelivery(cashUpId: string): Promise<number> {
    return this.db.sale.count({
      where: { cashUpId, businessId: this.businessId, status: SaleStatus.TO_DELIVER },
    });
  }
  async countByStatus(cashUpId: string): Promise<SaleStatusCounts> {
    const rows = await this.db.sale.groupBy({
      by: ['status'],
      where: { cashUpId, businessId: this.businessId },
      _count: { _all: true },
    });
    const counts: SaleStatusCounts = { total: 0, delivered: 0, toDeliver: 0, deleted: 0 };
    for (const row of rows) {
      const count = row._count._all;
      counts.total += count;
      switch (row.status) {
        case SaleStatus.DELIVERED:
          counts.delivered = count;
          break;
        case SaleStatus.TO_DELIVER:
          counts.toDeliver = count;
          break;
        case SaleStatus.DELETED:
          counts.deleted = count;
          break;
      }
    }
    return counts;
  }
  // ----------------------------------------------------------- aggregates
  //
  // The database only sums. The expected-cash formula (FR14) lives in one pure domain
  // function so it can be unit-tested (NFR1).
  /** DELIVERED sales grouped by currency and method (cash vs Whish vs OMT). Feeds FR12 / FR14. */
  async totalsByCurrencyAndMethod(cashUpId: string): Promise<SaleTotalsRow[]> {
    const rows = await this.db.sale.groupBy({
      by: ['method'],
      where: { cashUpId, businessId: this.businessId, status: SaleStatus.DELIVERED },
      _sum: {
        businessAmountUsd: true,
        businessAmountLbp: true,
        deliveryFeeUsd: true,
        deliveryFeeLbp: true,
        tipUsd: true,
        tipLbp: true,
        discountUsd: true,
        discountLbp: true,
        totalCollectedUsd: true,
        totalCollectedLbp: true,
        changeGivenUsd: true,
        changeGivenLbp: true,
      },
      _count: { _all: true },
    });
    return rows.flatMap(row => (['USD', 'LBP'] as const).map(currency => {
      const suffix = currency === 'USD' ? 'Usd' : 'Lbp';
      return {
        currency,
        method: requireDeliveredMethod(row.method),
        count: row._count._all,
        businessAmount: row._sum[`businessAmount${suffix}`] ?? ZERO,
        deliveryFee: row._sum[`deliveryFee${suffix}`] ?? ZERO,
        totalCollected: row._sum[`totalCollected${suffix}`] ?? ZERO,
        tip: row._sum[`tip${suffix}`] ?? ZERO,
        discount: row._sum[`discount${suffix}`] ?? ZERO,
      };
    }));
  }
  async changeGivenByCurrency(cashUpId: string): Promise<ChangeTotalsRow[]> {
    const row = await this.db.sale.aggregate({
      where: { cashUpId, businessId: this.businessId, status: SaleStatus.DELIVERED },
      _sum: { changeGivenUsd: true, changeGivenLbp: true },
    });
    return [{ currency: 'USD', total: row._sum.changeGivenUsd ?? ZERO }, { currency: 'LBP', total: row._sum.changeGivenLbp ?? ZERO }];
  }
  async totalsByCurrency(cashUpId: string, filter: SaleListFilter = {}) {
    const row = await this.db.sale.aggregate({
      where: { ...this.listWhere(cashUpId, filter), status: SaleStatus.DELIVERED },
      _sum: { totalCollectedUsd: true, totalCollectedLbp: true },
      _count: { _all: true }
    });
    return [{
      currency: 'USD' as const,
      count: row._count._all,
      totalCollected: row._sum.totalCollectedUsd ?? ZERO
    },
    {
      currency: 'LBP' as const,
      count: row._count._all,
      totalCollected: row._sum.totalCollectedLbp ?? ZERO
    }];
  }
  /** FR20: counts behind the review flags, e.g. "3 of 12 sales deleted". */
  async flagCounts(cashUpId: string): Promise<SaleFlagCounts> {
    const base = { cashUpId, businessId: this.businessId };
    const [total, deleted, edited, amountDiffers, deletionAwaiting] = await Promise.all([
      this.db.sale.count({ where: base }),
      this.db.sale.count({ where: { ...base, status: SaleStatus.DELETED } }),
      this.db.sale.count({ where: { ...base, isEdited: true } }),
      this.db.sale.count({ where: { ...base, amountDiffers: true } }),
      this.db.sale.count({ where: { ...base, deletionAwaiting: true } }),
    ]);
    return { total, deleted, edited, amountDiffers, deletionAwaiting };
  }
  // --------------------------------------------------------------- helpers
  private async lockSaleForUpdate(id: string): Promise<Sale> {
    const beforeLock = await this.findById(id);
    if (!beforeLock)
      throw new NotFoundError('Sale');
    await new CashUpRepository(this.businessId, this.db).lockOpenForUpdate(beforeLock.cashUpId);
    const sale = await this.findById(id);
    if (!sale)
      throw new NotFoundError('Sale');
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
    if (!row)
      throw new StaleStateError('Sale');
    return row;
  }
}
// -------------------------------------------------------------- edit-log helpers
function isDecimalLike(v: unknown): boolean {
  return v instanceof Prisma.Decimal;
}
function sameValue(prev: unknown, next: unknown): boolean {
  if (prev == null || next == null)
    return prev == null && next == null;
  // Money fields: compare numerically, so "10" and "10.00" are the same value.
  if (isDecimalLike(prev) || isDecimalLike(next)) {
    return new Prisma.Decimal(prev as Money).equals(new Prisma.Decimal(next as Money));
  }
  return prev === next;
}
function asText(value: unknown, money: boolean): string | null {
  if (value == null)
    return null;
  return money ? new Prisma.Decimal(value as Money).toFixed(2) : String(value);
}

function requireDeliveredMethod(method: PaymentMethod | null): PaymentMethod {
  if (method === null) throw new Error('Delivered sale has no payment method');
  return method;
}
