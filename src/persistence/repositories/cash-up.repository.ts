import { Prisma } from '../../generated/prisma/client';
import { CashUpStatus } from '../../generated/prisma/enums';
import { TenantRepository } from '../base.repository';
import {
  DuplicateError,
  NotFoundError,
  StaleStateError,
  isRecordNotFound,
  isUniqueViolation,
} from '../errors';
import type { Money } from '../types';

export interface OpenCashUpInput {
  membershipId: string;
  floatUsd?: Money; // default 0
  floatLbp?: Money; // default 0
  referenceRate?: Money | null;
}

/** Numbers the server computed on submit (FR14, NFR13). Per currency, never combined. */
export interface CashUpSnapshot {
  expectedUsd: Money;
  expectedLbp: Money;
  countedUsd: Money;
  countedLbp: Money;
  gapUsd: Money;
  gapLbp: Money;
}

export class CashUpRepository extends TenantRepository {
  // ---------------------------------------------------------------- create

  /**
   * FR5: one OPEN cash-up per person per business. The partial unique index
   * (one_open_cashup_per_member) is the real guard; this turns its error into a DuplicateError.
   */
  async open(input: OpenCashUpInput) {
    const membership = await this.db.membership.findFirst({
      where: { id: input.membershipId, businessId: this.businessId, isActive: true },
      select: { id: true },
    });
    if (!membership) throw new NotFoundError('Membership');

    try {
      return await this.db.cashUp.create({
        data: {
          businessId: this.businessId,
          membershipId: input.membershipId,
          floatUsd: input.floatUsd ?? 0,
          floatLbp: input.floatLbp ?? 0,
          referenceRate: input.referenceRate ?? null,
        },
      });
    } catch (e) {
      if (isUniqueViolation(e)) throw new DuplicateError('An open cash-up for this person');
      throw e;
    }
  }

  // ----------------------------------------------------------------- reads

  /** Full record, for the person who owns the cash-up. Returns null if it is someone else's. */
  findOwn(id: string, membershipId: string) {
    return this.db.cashUp.findFirst({
      where: { id, businessId: this.businessId, membershipId },
    });
  }

  /**
   * Full record for the reviewer (Manager / Owner). Open cash-ups are deliberately
   * invisible here (FR6, NFR14): reviewers only see them through `listOpenSummaries`.
   */
  findForReview(id: string) {
    return this.db.cashUp.findFirst({
      where: { id, businessId: this.businessId, status: { not: CashUpStatus.OPEN } },
      include: { membership: { include: { user: { select: { id: true, fullName: true } } } } },
    });
  }

  /** Unscoped-by-visibility read for service logic that already checked permissions. */
  findById(id: string) {
    return this.db.cashUp.findFirst({ where: { id, businessId: this.businessId } });
  }

  findOpenByMembership(membershipId: string) {
    return this.db.cashUp.findFirst({
      where: { businessId: this.businessId, membershipId, status: CashUpStatus.OPEN },
    });
  }

  /** A person's own history, voided cash-ups included (FR24). */
  listOwn(membershipId: string, opts: { take?: number; cursorId?: string } = {}) {
    return this.db.cashUp.findMany({
      where: { businessId: this.businessId, membershipId },
      orderBy: [{ openedAt: 'desc' }, { id: 'desc' }],
      take: opts.take ?? 30,
      ...(opts.cursorId ? { cursor: { id: opts.cursorId }, skip: 1 } : {}),
    });
  }

  /**
   * FR6: what a reviewer may see of an open cash-up — who, since when, how many sales and
   * requests. `select` leaves out the float and every other number on purpose.
   */
  listOpenSummaries() {
    return this.db.cashUp.findMany({
      where: { businessId: this.businessId, status: CashUpStatus.OPEN },
      select: {
        id: true,
        openedAt: true,
        membership: { select: { id: true, user: { select: { fullName: true } } } },
        _count: { select: { sales: true, requests: true } },
      },
      orderBy: { openedAt: 'asc' },
    });
  }

  /** FR27: submitted cash-ups waiting for a decision, oldest first. */
  listSubmitted() {
    return this.db.cashUp.findMany({
      where: { businessId: this.businessId, status: CashUpStatus.SUBMITTED },
      include: { membership: { select: { id: true, user: { select: { fullName: true } } } } },
      orderBy: { closedAt: 'asc' },
    });
  }

  /** Reviewer history of finished cash-ups (approved / void), newest first. */
  listReviewed(opts: { from?: Date; to?: Date; membershipId?: string; take?: number } = {}) {
    return this.db.cashUp.findMany({
      where: {
        businessId: this.businessId,
        status: { in: [CashUpStatus.APPROVED, CashUpStatus.VOID] },
        ...(opts.membershipId ? { membershipId: opts.membershipId } : {}),
        ...(opts.from || opts.to ? { openedAt: { gte: opts.from, lte: opts.to } } : {}),
      },
      orderBy: { openedAt: 'desc' },
      take: opts.take ?? 50,
    });
  }

  // ---------------------------------------------- guarded state transitions
  //
  // Every transition is `updateMany ... where status = <expected>`; zero rows means somebody
  // else got there first (NFR16), reported as StaleStateError.

  /** OPEN -> SUBMITTED. Freezes staff editing and stores the server-computed snapshot. */
  async submit(id: string, snapshot: CashUpSnapshot) {
    await this.transition(id, [CashUpStatus.OPEN], {
      status: CashUpStatus.SUBMITTED,
      closedAt: new Date(),
      ...snapshot,
    });
    return this.requireById(id);
  }

  /** SUBMITTED -> APPROVED (final and locked). `selfApproved` is always recorded. */
  async approve(id: string, approvedById: string, selfApproved: boolean) {
    await this.transition(id, [CashUpStatus.SUBMITTED], {
      status: CashUpStatus.APPROVED,
      approvedAt: new Date(),
      approvedById,
      selfApproved,
    });
    return this.requireById(id);
  }

  /** SUBMITTED -> OPEN with a required reason. Clears the snapshot; it is recomputed on re-submit. */
  async returnToOpen(id: string, reason: string) {
    await this.transition(id, [CashUpStatus.SUBMITTED], {
      status: CashUpStatus.OPEN,
      returnReason: reason,
      closedAt: null,
      expectedUsd: null,
      expectedLbp: null,
      countedUsd: null,
      countedLbp: null,
      gapUsd: null,
      gapLbp: null,
    });
    return this.requireById(id);
  }

  /** OPEN -> VOID. Kept in history with its reason, never deleted. */
  async voidCashUp(id: string, reason: string) {
    await this.transition(id, [CashUpStatus.OPEN], {
      status: CashUpStatus.VOID,
      voidedAt: new Date(),
      voidReason: reason,
    });
    return this.requireById(id);
  }

  /** Records when counting started, once (pilot metric, FR29). No error if already set. */
  async markCountStarted(id: string): Promise<void> {
    await this.db.cashUp.updateMany({
      where: { id, businessId: this.businessId, status: CashUpStatus.OPEN, countStartedAt: null },
      data: { countStartedAt: new Date() },
    });
  }

  /**
   * Atomically hands out the next sale number, only while the cash-up is OPEN.
   * Safe under concurrent requests: the increment happens in a single UPDATE.
   */
  async nextSaleNumber(id: string): Promise<number> {
    try {
      const row = await this.db.cashUp.update({
        where: { id, businessId: this.businessId, status: CashUpStatus.OPEN },
        data: { lastSaleNumber: { increment: 1 } },
        select: { lastSaleNumber: true },
      });
      return row.lastSaleNumber;
    } catch (e) {
      if (isRecordNotFound(e)) throw new StaleStateError('Cash-up');
      throw e;
    }
  }

  // --------------------------------------------------------------- helpers

  private async transition(
    id: string,
    from: CashUpStatus[],
    data: Prisma.CashUpUncheckedUpdateManyInput,
  ): Promise<void> {
    const { count } = await this.db.cashUp.updateMany({
      where: { id, businessId: this.businessId, status: { in: from } },
      data,
    });
    if (count === 0) throw new StaleStateError('Cash-up');
  }

  private async requireById(id: string) {
    const row = await this.findById(id);
    if (!row) throw new StaleStateError('Cash-up');
    return row;
  }
}
