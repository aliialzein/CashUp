import type { PrismaClient } from '../../../src/generated/prisma/client';
import { CashUpRepository } from '../../../src/modules/cash-ups/cash-ups.repository';
it('queries an OPEN membership record directly with business scope', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const db = { cashUp: { findFirst } } as unknown as PrismaClient;
    expect(await new CashUpRepository('business', db).findOpenByMembership('member')).toBeNull();
    expect(findFirst).toHaveBeenCalledWith({ where: { businessId: 'business', membershipId: 'member', status: 'OPEN' } });
});
it('counts all related sales in the history query and preserves cursor order and limits', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const db = { cashUp: { findMany } } as unknown as PrismaClient;
    await new CashUpRepository('business', db).listOwn('member', { take: 3, cursorId: 'anchor' });
    expect(findMany).toHaveBeenCalledWith({
        where: { businessId: 'business', membershipId: 'member' }, include: { _count: { select: { sales: true } } },
        orderBy: [{ openedAt: 'desc' }, { id: 'desc' }], take: 3, cursor: { id: 'anchor' }, skip: 1
    });
});
it('scopes pending amendment inventory to the business, cash-up and awaiting state', async () => {
    const historical = [{ field: 'totalCollected' }];
    const findMany = jest.fn().mockResolvedValue(historical);
    const db = { amendmentChange: { findMany } } as unknown as PrismaClient;
    expect(await new CashUpRepository('business', db).pendingSaleAmendmentFields('cashup')).toEqual(historical);
    expect(findMany).toHaveBeenCalledWith({ where: { kind: 'SALE_FIELD', amendment: { businessId: 'business', cashUpId: 'cashup', status: 'AWAITING_APPROVAL' } }, select: { field: true } });
});
it('scopes saved denomination reads through their cash-up parent', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const db = { countEntry: { findMany } } as unknown as PrismaClient;
    await new CashUpRepository('business', db).listByCashUp('cashup');
    expect(findMany).toHaveBeenCalledWith({ where: { cashUpId: 'cashup', cashUp: { businessId: 'business' } }, orderBy: [{ currency: 'asc' }, { denomination: 'desc' }] });
});
