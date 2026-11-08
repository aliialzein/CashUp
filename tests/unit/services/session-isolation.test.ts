import { withTestMember } from '../../support/service-context';
import { getBusiness } from '../../../src/modules/business/business.service';
import type { CurrentMember } from '../../../src/modules/auth/auth.types';
import type { PrismaClient } from '../../../src/generated/prisma/client';

afterEach(() => jest.restoreAllMocks());
it('keeps concurrent service identities and database boundaries isolated', async () => {
  const a: CurrentMember = { userId: 'a-user', membershipId: 'a-member', businessId: 'a-business', role: 'OWNER' };
  const b: CurrentMember = { userId: 'b-user', membershipId: 'b-member', businessId: 'b-business', role: 'STAFF' };
  const database = (member: CurrentMember) => ({ business: { findUnique: async ({ where }: { where: { id: string } }) => {
    await new Promise(resolve => setTimeout(resolve, member === a ? 10 : 1));
    expect(where.id).toBe(member.businessId);
    return { id: member.businessId, name: member.userId, isSolo: false };
  } } }) as unknown as PrismaClient;
  const results = await Promise.all([withTestMember(a, database(a), () => getBusiness()), withTestMember(b, database(b), () => getBusiness())]);
  expect(results).toEqual([{ id: a.businessId, name: a.userId, isSolo: false, role: 'OWNER' }, { id: b.businessId, name: b.userId, isSolo: false, role: 'STAFF' }]);
});
