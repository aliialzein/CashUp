import { withTestMember, withTestIdentity } from '../../support/service-context';
import { repositoriesForTest, makeSaleInput } from '../persistence/test-support';
import { resolveMember } from '../../../src/modules/auth/auth.service';
import * as BusinessSetupService from '../../../src/modules/business/business.service';
import * as CashUpLifecycleService from '../../../src/modules/cash-ups/cash-ups.service';
import * as CashUpQueryService from '../../../src/modules/cash-ups/cash-ups.service';
import * as SaleService from '../../../src/modules/sales/sales.service';
import * as CashOutService from '../../../src/modules/cash-outs/cash-outs.service';
import * as CountService from '../../../src/modules/cash-ups/cash-ups.service';
import type { CurrentMember } from '../../../src/modules/auth/auth.types';
import { prisma, resetDatabase, seedBusinesses, type BusinessFixture } from '../persistence/test-support';
export { prisma, resetDatabase, seedBusinesses, };
export const services = {
    memberFor: (userId: string, businessId: string) => withTestIdentity(userId, prisma, () => resolveMember({ userId, businessId })), businessSetup: {
        createBusiness: (arg0: string, arg1: Parameters<typeof BusinessSetupService.createBusiness>[0]) => withTestIdentity(arg0, prisma, () => BusinessSetupService.createBusiness(arg1)),
        getBusiness: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember) => withTestMember(arg0, prisma, () => BusinessSetupService.getBusiness()),
        listMembers: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember) => withTestMember(arg0, prisma, () => BusinessSetupService.listMembers()),
        deactivateMember: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof BusinessSetupService.deactivateMember>[0]) => withTestMember(arg0, prisma, () => BusinessSetupService.deactivateMember(arg1)),
        replaceManager: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof BusinessSetupService.replaceManager>[0]) => withTestMember(arg0, prisma, () => BusinessSetupService.replaceManager(arg1)),
        setBusinessSolo: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof BusinessSetupService.setBusinessSolo>[0]) => withTestMember(arg0, prisma, () => BusinessSetupService.setBusinessSolo(arg1)),
        createJoinCode: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof BusinessSetupService.createJoinCode>[0]) => withTestMember(arg0, prisma, () => BusinessSetupService.createJoinCode(arg1)),
        listJoinCodes: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember) => withTestMember(arg0, prisma, () => BusinessSetupService.listJoinCodes()),
        revokeJoinCode: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof BusinessSetupService.revokeJoinCode>[0]) => withTestMember(arg0, prisma, () => BusinessSetupService.revokeJoinCode(arg1)),
        redeemJoinCode: (arg0: string, arg1: Parameters<typeof BusinessSetupService.redeemJoinCode>[0]) => withTestIdentity(arg0, prisma, () => BusinessSetupService.redeemJoinCode(arg1))
    },
    lifecycle: {
        open: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashUpLifecycleService.openCashUp>[0]) => withTestMember(arg0, prisma, () => CashUpLifecycleService.openCashUp(arg1)),
        submit: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashUpLifecycleService.submitCashUp>[0]) => withTestMember(arg0, prisma, () => CashUpLifecycleService.submitCashUp(arg1)),
        approve: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashUpLifecycleService.approveCashUp>[0]) => withTestMember(arg0, prisma, () => CashUpLifecycleService.approveCashUp(arg1)),
        returnToOpen: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashUpLifecycleService.returnCashUpToOpen>[0], arg2: Parameters<typeof CashUpLifecycleService.returnCashUpToOpen>[1]) => withTestMember(arg0, prisma, () => CashUpLifecycleService.returnCashUpToOpen(arg1, arg2)),
        voidOwnOpen: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashUpLifecycleService.voidOwnOpenCashUp>[0], arg2: Parameters<typeof CashUpLifecycleService.voidOwnOpenCashUp>[1]) => withTestMember(arg0, prisma, () => CashUpLifecycleService.voidOwnOpenCashUp(arg1, arg2))
    }, queries: {
        getOwn: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashUpQueryService.getOwnCashUp>[0]) => withTestMember(arg0, prisma, () => CashUpQueryService.getOwnCashUp(arg1)),
        getOwnOpen: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember) => withTestMember(arg0, prisma, () => CashUpQueryService.getOwnOpenCashUp()),
        listOwn: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashUpQueryService.listOwnCashUps>[0]) => withTestMember(arg0, prisma, () => CashUpQueryService.listOwnCashUps(arg1)),
        listOpenSummaries: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember) => withTestMember(arg0, prisma, () => CashUpQueryService.listOpenCashUpSummaries()),
        listSubmitted: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember) => withTestMember(arg0, prisma, () => CashUpQueryService.listSubmittedCashUps()),
        listReviewed: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashUpQueryService.listReviewedCashUps>[0]) => withTestMember(arg0, prisma, () => CashUpQueryService.listReviewedCashUps(arg1)),
        getReviewDetail: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashUpQueryService.getCashUpReview>[0]) => withTestMember(arg0, prisma, () => CashUpQueryService.getCashUpReview(arg1))
    },
    sales: {
        create: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof SaleService.createSale>[0], arg2: Omit<Parameters<typeof SaleService.createSale>[1], 'idempotencyKey'>, arg3: string) => withTestMember(arg0, prisma, () => SaleService.createSale(arg1, { ...arg2, idempotencyKey: arg3 })),
        edit: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof SaleService.editSale>[0], arg2: Parameters<typeof SaleService.editSale>[1], arg3: Parameters<typeof SaleService.editSale>[2]) => withTestMember(arg0, prisma, () => SaleService.editSale(arg1, arg2, arg3)),
        confirmDelivery: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof SaleService.confirmSaleDelivery>[0], arg2: Parameters<typeof SaleService.confirmSaleDelivery>[1], arg3: Parameters<typeof SaleService.confirmSaleDelivery>[2]) => withTestMember(arg0, prisma, () => SaleService.confirmSaleDelivery(arg1, arg2, arg3)),
        cancel: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof SaleService.cancelSale>[0], arg2: Parameters<typeof SaleService.cancelSale>[1], arg3: Parameters<typeof SaleService.cancelSale>[2]) => withTestMember(arg0, prisma, () => SaleService.cancelSale(arg1, arg2, arg3))
    }, cashOuts: {
        create: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashOutService.createCashOut>[0], arg2: Omit<Parameters<typeof CashOutService.createCashOut>[1], 'idempotencyKey'>, arg3: string) => withTestMember(arg0, prisma, () => CashOutService.createCashOut(arg1, { ...arg2, idempotencyKey: arg3 })),
        cancel: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CashOutService.cancelCashOut>[0], arg2: Parameters<typeof CashOutService.cancelCashOut>[1], arg3: Parameters<typeof CashOutService.cancelCashOut>[2]) => withTestMember(arg0, prisma, () => CashOutService.cancelCashOut(arg1, arg2, arg3))
    }, counts: {
        getOwn: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CountService.getOwnCounts>[0]) => withTestMember(arg0, prisma, () => CountService.getOwnCounts(arg1)),
        replace: (arg0: import("../../../src/modules/auth/auth.types").CurrentMember, arg1: Parameters<typeof CountService.replaceOwnCounts>[0], arg2: Parameters<typeof CountService.replaceOwnCounts>[1]) => withTestMember(arg0, prisma, () => CountService.replaceOwnCounts(arg1, arg2))
    },
};
export async function staffActor(business: BusinessFixture, staff = 1) {
    const member = staff === 1 ? business.members.staff1 : business.members.staff2;
    return services.memberFor(member.userId, business.id);
}
export async function managerActor(business: BusinessFixture) {
    return services.memberFor(business.members.manager.userId, business.id);
}
export async function ownerActor(business: BusinessFixture) {
    return services.memberFor(business.members.owner.userId, business.id);
}
export async function openEmptyCashUp(business: BusinessFixture, actor?: CurrentMember) {
    return services.lifecycle.open(actor ?? (await staffActor(business)), {});
}
/** Valid success fixtures for the submission rules; financial totals stay unchanged. */
export async function prepareForSubmission(actor: CurrentMember, cashUpId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
        const repos = repositoriesForTest(actor.businessId, tx);
        await repos.cashUps.lockOpenForUpdate(cashUpId);
        const own = await repos.cashUps.findOwn(cashUpId, actor.membershipId);
        if (!own)
            throw new Error('Missing fixture cash-up');
        const flags = await repos.sales.flagCounts(cashUpId);
        if (flags.total === flags.deleted)
            await repos.sales.create(makeSaleInput(cashUpId, { method: 'WHISH' }));
        const counts = await repos.counts.listByCashUp(cashUpId);
        if (own.countStartedAt === null && counts.length === 0)
            await repos.counts.saveLines(cashUpId, [{ currency: 'USD', denomination: '1.00', quantity: 0 }]);
    }, { maxWait: 5000, timeout: 15000 });
}
