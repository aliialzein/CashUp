import { withTestIdentity } from '../../support/service-context';
import type { PrismaClient } from '../../../src/generated/prisma/client';
import { resolveMember } from '../../../src/modules/auth/auth.service';
const membership = { id: 'membership', userId: 'user', businessId: 'business', role: 'STAFF', status: 'ACTIVE' };
function resolver(row: unknown = membership) {
    const findFirst = jest.fn().mockResolvedValue(row);
    const db = { membership: { findFirst } } as unknown as PrismaClient;
    return { service: { resolve: (userId: string, businessId: string) => withTestIdentity(userId, db, () => resolveMember({ userId, businessId })) }, findFirst };
}
it('loads the active scoped membership on every resolution and supplies the trusted actor', async () => {
    const app = resolver();
    expect(await app.service.resolve('user', 'business')).toMatchObject({ membershipId: 'membership', role: 'STAFF' });
    await app.service.resolve('user', 'business');
    expect(app.findFirst).toHaveBeenCalledTimes(2);
    expect(app.findFirst).toHaveBeenCalledWith({ where: { businessId: 'business', userId: 'user', status: 'ACTIVE' }, select: { id: true, userId: true, businessId: true, role: true, status: true } });
});
it.each([null, { ...membership, status: 'INACTIVE' }, { ...membership, businessId: 'another' }])('hides missing, inactive and other-business membership %j', async (row) => {
    await expect(resolver(row).service.resolve('user', 'business')).rejects.toMatchObject({ code: 'ACTOR_NOT_ACTIVE' });
});
