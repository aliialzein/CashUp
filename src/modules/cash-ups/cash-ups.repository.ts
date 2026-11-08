import { getPrisma } from "../../shared/db/prisma";
import { type Db, type Money } from "../../shared/db/types";
import { NotInTransactionError, DuplicateError, NotFoundError, StaleStateError, isRecordNotFound, isUniqueViolation } from "../../shared/errors/persistence-errors";
import { Prisma, type CountEntry } from "../../generated/prisma/client";
import { CashUpStatus, MembershipStatus, type Currency, RequestStatus } from "../../generated/prisma/enums";
import { countDenominations } from "../../domain/money/cash-up-totals";
import 'server-only';
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
export class CashUpRepository {
    constructor(private readonly businessId: string, private readonly db: Db = getPrisma()) {
        if (!businessId)
            throw new Error('A repository requires a businessId');
    }
    // After the auth membership lock, lock the cash-up before other financial rows.
    // Creation takes the business lock first; existing-cash-up writes never upgrade that lock.
    // ---------------------------------------------------------------- create
    /**
     * FR5: one OPEN cash-up per person per business. The partial unique index
     * (one_open_cashup_per_member) is the real guard; this turns its error into a DuplicateError.
     */
    async open(input: OpenCashUpInput) {
        if (typeof Reflect.get(this.db, '$connect') === 'function')
            throw new NotInTransactionError();
        const membership = await this.db.membership.findFirst({
            where: {
                id: input.membershipId,
                businessId: this.businessId,
                status: MembershipStatus.ACTIVE,
            },
            select: { id: true },
        });
        if (!membership)
            throw new NotFoundError('Membership');
        const business = await this.db.business.update({
            where: { id: this.businessId },
            data: { lastCashUpNumber: { increment: 1 } },
            select: { lastCashUpNumber: true },
        });
        try {
            return await this.db.cashUp.create({
                data: {
                    businessId: this.businessId,
                    membershipId: input.membershipId,
                    number: business.lastCashUpNumber,
                    floatUsd: input.floatUsd ?? 0,
                    floatLbp: input.floatLbp ?? 0,
                    referenceRate: input.referenceRate ?? null,
                },
            });
        }
        catch (e) {
            if (isUniqueViolation(e))
                throw new DuplicateError('An open cash-up for this person');
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
    countUnresolvedCashUpsForUser(userId: string) {
        return this.db.cashUp.count({
            where: {
                businessId: this.businessId,
                membership: { userId },
                status: { in: [CashUpStatus.OPEN, CashUpStatus.SUBMITTED] },
            },
        });
    }
    findOpenByMembership(membershipId: string) {
        return this.db.cashUp.findFirst({
            where: { businessId: this.businessId, membershipId, status: CashUpStatus.OPEN },
        });
    }
    /** A person's own history, voided cash-ups included (FR24). */
    listOwn(membershipId: string, opts: {
        take?: number;
        cursorId?: string;
    } = {}) {
        return this.db.cashUp.findMany({
            where: { businessId: this.businessId, membershipId },
            include: { _count: { select: { sales: true } } },
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
                number: true,
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
    listReviewed(opts: {
        from?: Date;
        to?: Date;
        membershipId?: string;
        take?: number;
        cursorId?: string;
    } = {}) {
        return this.db.cashUp.findMany({
            where: {
                businessId: this.businessId,
                status: { in: [CashUpStatus.APPROVED, CashUpStatus.VOID] },
                ...(opts.membershipId ? { membershipId: opts.membershipId } : {}),
                ...(opts.from || opts.to ? { openedAt: { gte: opts.from, lte: opts.to } } : {}),
            },
            orderBy: [{ openedAt: 'desc' }, { id: 'desc' }],
            take: opts.take ?? 50,
            ...(opts.cursorId ? { cursor: { id: opts.cursorId }, skip: 1 } : {}),
        });
    }
    /** Read-only inventory; never reinterpret or update historical field strings. */
    pendingSaleAmendmentFields(cashUpId: string) {
        return this.db.amendmentChange.findMany({
            where: { kind: 'SALE_FIELD', amendment: { businessId: this.businessId, cashUpId, status: 'AWAITING_APPROVAL' } },
            select: { field: true },
        });
    }
    // ---------------------------------------------- guarded state transitions
    //
    // Every transition is `updateMany ... where status = <expected>`; zero rows means somebody
    // else got there first (NFR16), reported as StaleStateError.
    /**
     * OPEN -> SUBMITTED. The caller must compute the snapshot only after acquiring this same
     * transaction's cash-up lock: service Prisma transaction -> lockForUpdate -> read aggregates -> submit.
     */
    async submit(id: string, snapshot: CashUpSnapshot) {
        await this.lockForUpdate(id);
        await this.transition(id, [CashUpStatus.OPEN], {
            status: CashUpStatus.SUBMITTED,
            closedAt: new Date(),
            ...snapshot,
        });
        return this.requireById(id);
    }
    /** SUBMITTED -> APPROVED (final and locked). `selfApproved` is always recorded. */
    async approve(id: string, approvedById: string, selfApproved: boolean) {
        await this.lockForUpdate(id);
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
        await this.lockForUpdate(id);
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
        await this.lockForUpdate(id);
        await this.transition(id, [CashUpStatus.OPEN], {
            status: CashUpStatus.VOID,
            voidedAt: new Date(),
            voidReason: reason,
        });
        return this.requireById(id);
    }
    /**
     * Atomically hands out the next sale number, only while the cash-up is OPEN.
     * Safe under concurrent requests: the increment happens in a single UPDATE.
     */
    async nextSaleNumber(id: string): Promise<number> {
        await this.lockOpenForUpdate(id);
        try {
            const row = await this.db.cashUp.update({
                where: { id, businessId: this.businessId, status: CashUpStatus.OPEN },
                data: { lastSaleNumber: { increment: 1 } },
                select: { lastSaleNumber: true },
            });
            return row.lastSaleNumber;
        }
        catch (e) {
            if (isRecordNotFound(e))
                throw new StaleStateError('Cash-up');
            throw e;
        }
    }
    // --------------------------------------------------------------- helpers
    async lockForUpdate(id: string): Promise<{
        id: string;
        status: CashUpStatus;
    }> {
        if (typeof Reflect.get(this.db, '$connect') === 'function')
            throw new NotInTransactionError();
        const rows = await this.db.$queryRaw<Array<{
            id: string;
            status: CashUpStatus;
        }>>(Prisma.sql `
      SELECT "id", "status"
      FROM "cash_ups"
      WHERE "id" = ${id}::uuid
        AND "businessId" = ${this.businessId}::uuid
      FOR UPDATE
    `);
        const cashUp = rows[0];
        if (!cashUp)
            throw new NotFoundError('Cash-up');
        return cashUp;
    }
    async lockOpenForUpdate(id: string): Promise<{
        id: string;
        status: CashUpStatus;
    }> {
        const cashUp = await this.lockForUpdate(id);
        if (cashUp.status !== CashUpStatus.OPEN)
            throw new StaleStateError('Cash-up');
        return cashUp;
    }
    private async transition(id: string, from: CashUpStatus[], data: Prisma.CashUpUncheckedUpdateManyInput): Promise<void> {
        const { count } = await this.db.cashUp.updateMany({
            where: { id, businessId: this.businessId, status: { in: from } },
            data,
        });
        if (count === 0)
            throw new StaleStateError('Cash-up');
    }
    private async requireById(id: string) {
        const row = await this.findById(id);
        if (!row)
            throw new StaleStateError('Cash-up');
        return row;
    }
    /**
     * Replaces the draft count working set atomically for this cash-up while OPEN.
     * Omitted lines are reset to zero rather than deleted, matching the count contract.
     */
    async saveLines(cashUpId: string, lines: CountLine[]): Promise<CountEntry[]> {
        await new CashUpRepository(this.businessId, this.db).lockOpenForUpdate(cashUpId);
        const current = await this.db.countEntry.findMany({
            where: { cashUpId, cashUp: { businessId: this.businessId } },
        });
        const desired = new Map<string, CountLine>();
        for (const line of lines) {
            desired.set(`${line.currency}:${new Prisma.Decimal(line.denomination).toString()}`, line);
        }
        const saved: CountEntry[] = [];
        for (const row of current) {
            const key = `${row.currency}:${row.denomination.toString()}`;
            const replacement = desired.get(key);
            if (!replacement) {
                saved.push(await this.db.countEntry.update({
                    where: { id: row.id },
                    data: { quantity: 0 },
                }));
            }
            else if (replacement.quantity !== row.quantity) {
                saved.push(await this.db.countEntry.update({
                    where: { id: row.id },
                    data: { quantity: replacement.quantity },
                }));
            }
            else {
                saved.push(row);
            }
            desired.delete(key);
        }
        for (const line of desired.values()) {
            saved.push(await this.db.countEntry.create({
                data: {
                    cashUpId,
                    currency: line.currency,
                    denomination: line.denomination,
                    quantity: line.quantity,
                },
            }));
        }
        await this.db.cashUp.updateMany({
            where: {
                id: cashUpId,
                businessId: this.businessId,
                countStartedAt: null,
                status: 'OPEN',
            },
            data: { countStartedAt: new Date() },
        });
        return saved;
    }
    listByCashUp(cashUpId: string) {
        return this.db.countEntry.findMany({
            where: { cashUpId, cashUp: { businessId: this.businessId } },
            orderBy: [{ currency: 'asc' }, { denomination: 'desc' }],
        });
    }
    /** Counted cash per currency: sum of denomination x quantity. Never combined across currencies. */
    async countedTotals(cashUpId: string): Promise<Record<Currency, Prisma.Decimal>> {
        const entries = await this.listByCashUp(cashUpId);
        const totals = countDenominations(entries);
        return { USD: new Prisma.Decimal(totals.USD), LBP: new Prisma.Decimal(totals.LBP) };
    }
    countAwaitingByCashUp(cashUpId: string): Promise<number> {
        return this.db.request.count({
            where: {
                cashUpId,
                businessId: this.businessId,
                status: RequestStatus.AWAITING_OWNER,
            },
        });
    }
}
export interface CountLine {
    currency: Currency;
    /** Note value, e.g. 100 for a $100 bill or 100000 for a 100,000 LBP note. */
    denomination: Money;
    quantity: number;
}
