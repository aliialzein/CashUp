import { withTestMember } from '../../support/service-context';
import type { Prisma, PrismaClient } from '../../../src/generated/prisma/client';
import * as CashUpLifecycleService from '../../../src/modules/cash-ups/cash-ups.service';
import * as CashUpQueryService from '../../../src/modules/cash-ups/cash-ups.service';
import type { CurrentMember } from '../../../src/modules/auth/auth.types';
import { NotFoundError } from '../../../src/shared/errors/persistence-errors';
import { mockRepositories, testDatabase } from './repository-mocks';
const actor: CurrentMember = { userId: 'user', membershipId: 'member', businessId: 'business', role: 'STAFF', };
it('uses one transaction client and actor business scope for every participating repository', async () => {
    const tx = {} as Prisma.TransactionClient;
    const seen: unknown[][] = [];
    const failure = new Error('audit failed');
    const observe = (self: object) => seen.push([Reflect.get(self, 'db'), Reflect.get(self, 'businessId')]);
    const cashUp = { id: '10000000-0000-4000-8000-000000000001', number: 1 };
    mockRepositories({
        businesses: { findSettings: async function () { observe(this); return { id: actor.businessId, name: 'Shop', isSolo: false }; } },
        cashUps: { open: async function () { observe(this); return cashUp as Awaited<ReturnType<import('../../../src/modules/cash-ups/cash-ups.repository').CashUpRepository['open']>>; } },
        audit: { append: async function () { observe(this); throw failure; } },
    });
    const transaction = jest.fn(async (work: (db: Prisma.TransactionClient) => Promise<unknown>) => work(tx));
    const db = { $transaction: transaction } as unknown as PrismaClient;
    await expect({
        open: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashUpLifecycleService.openCashUp>[0]) => withTestMember(arg0, db, () => CashUpLifecycleService.openCashUp(arg1)),
        submit: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashUpLifecycleService.submitCashUp>[0]) => withTestMember(arg0, db, () => CashUpLifecycleService.submitCashUp(arg1)),
        approve: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashUpLifecycleService.approveCashUp>[0]) => withTestMember(arg0, db, () => CashUpLifecycleService.approveCashUp(arg1)),
        returnToOpen: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashUpLifecycleService.returnCashUpToOpen>[0], arg2: Parameters<typeof CashUpLifecycleService.returnCashUpToOpen>[1]) => withTestMember(arg0, db, () => CashUpLifecycleService.returnCashUpToOpen(arg1, arg2)),
        voidOwnOpen: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashUpLifecycleService.voidOwnOpenCashUp>[0], arg2: Parameters<typeof CashUpLifecycleService.voidOwnOpenCashUp>[1]) => withTestMember(arg0, db, () => CashUpLifecycleService.voidOwnOpenCashUp(arg1, arg2))
    }.open(actor, {})).rejects.toBe(failure);
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), { maxWait: 5000, timeout: 15000 });
    expect(seen).toEqual([[tx, 'business'], [tx, 'business'], [tx, 'business']]);
});
it('reads through concrete repositories without a transaction and preserves error translation', async () => {
    mockRepositories({ businesses: { findSettings: async () => { throw new NotFoundError('Business'); } } });
    const db = testDatabase();
    await expect({
        getOwn: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashUpQueryService.getOwnCashUp>[0]) => withTestMember(arg0, db, () => CashUpQueryService.getOwnCashUp(arg1)),
        getOwnOpen: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember) => withTestMember(arg0, db, () => CashUpQueryService.getOwnOpenCashUp()),
        listOwn: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashUpQueryService.listOwnCashUps>[0]) => withTestMember(arg0, db, () => CashUpQueryService.listOwnCashUps(arg1)),
        listOpenSummaries: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember) => withTestMember(arg0, db, () => CashUpQueryService.listOpenCashUpSummaries()),
        listSubmitted: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember) => withTestMember(arg0, db, () => CashUpQueryService.listSubmittedCashUps()),
        listReviewed: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashUpQueryService.listReviewedCashUps>[0]) => withTestMember(arg0, db, () => CashUpQueryService.listReviewedCashUps(arg1)),
        getReviewDetail: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashUpQueryService.getCashUpReview>[0]) => withTestMember(arg0, db, () => CashUpQueryService.getCashUpReview(arg1))
    }.getOwn(actor, '10000000-0000-4000-8000-000000000001')).rejects.toMatchObject({ code: 'ENTITY_NOT_FOUND' });
    expect(db.$transaction).not.toHaveBeenCalled();
});
