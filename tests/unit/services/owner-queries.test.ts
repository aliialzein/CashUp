import { CashUpRepository } from '../../../src/modules/cash-ups/cash-ups.repository';
import { SaleRepository } from '../../../src/modules/sales/sales.repository';
import { BusinessRepository } from '../../../src/modules/business/business.repository';
import { listOwnerCashUps, getOwnerCashUpDetail } from '../../../src/modules/cash-ups/cash-ups.service';
import { withTestMember } from '../../support/service-context';
import { mockRepositories, testDatabase } from './repository-mocks';
import { actor, cashUp, date } from './driver-fixtures';
import { Prisma } from '../../../src/generated/prisma/client';

const owner = { ...actor, role: 'OWNER' as const };
afterEach(() => jest.restoreAllMocks());
function setup(solo = false, status: 'OPEN' | 'SUBMITTED' = 'OPEN') {
  const row = cashUp({ status, membershipId: 'member' });
  const request = { id: 'request', type: 'DELETE_SALE' as const, status: 'AWAITING_OWNER' as const, reason: 'Cancel order',
    businessId: 'business', cashUpId: row.id, saleId: 'sale', requestedById: 'member', decidedById: null,
    decisionReason: null, selfApproved: false, decidedAt: null, createdAt: date, updatedAt: date,
    requestedBy: { user: { fullName: 'Owner' } }, decidedBy: null, sale: { saleNumber: 1 } };
  const meta = { id: row.id, number: 1, status, openedAt: date, membershipId: 'member', returnReason: null, voidReason: null,
    membership: { role: 'OWNER' as const, user: { fullName: 'Owner' } }, _count: { sales: 1 }, requests: [request] };
  mockRepositories({ businesses: { findSettings: async () => ({ id: 'business', name: 'Shop', isSolo: solo }) },
    cashUps: { findForReview: async () => ({ ...row, membership: { ...meta.membership, user: { id: 'u', fullName: 'Owner' }, id: 'member', userId: 'u', businessId: 'business', status: 'ACTIVE', joinedAt: date, deactivatedAt: null } }) },
    sales: { list: async () => [], countByStatus: async () => ({ total: 0, delivered: 0, toDeliver: 0, deleted: 0 }),
      flagCounts: async () => ({ total: 0, deleted: 0, edited: 0, amountDiffers: 0, deletionAwaiting: 0 }),
      totalsByCurrencyAndMethod: async () => [], changeGivenByCurrency: async () => [] },
    cashOuts: { listByCashUp: async () => [] }, counts: { listByCashUp: async () => [], countedTotals: async () => ({ USD: new Prisma.Decimal(0), LBP: new Prisma.Decimal(0) }) },
  });
  jest.spyOn(CashUpRepository.prototype, 'listOwnerSummaries').mockResolvedValue([meta]);
  const find = jest.spyOn(CashUpRepository.prototype, 'findOwnerSummary').mockResolvedValue(meta);
  jest.spyOn(SaleRepository.prototype, 'listEditsForCashUp').mockResolvedValue([]);
  const db = testDatabase();
  return { find, meta, run: <T>(fn: () => T) => withTestMember(owner, db, fn), db };
}
it('exposes only metadata for OPEN cash-ups and prevents non-solo self-decisions', async () => {
  const app = setup();
  const result = await app.run(() => getOwnerCashUpDetail(app.meta.id));
  expect(result.review).toBeNull(); expect(result.edits).toEqual([]);
  expect(result.requests[0]).toMatchObject({ requestedByName: 'Owner', canDecide: false, saleNumber: 1 });
  expect(await app.run(listOwnerCashUps)).toHaveLength(1);
});
it('permits solo self-review reads using the same policy as approval and exposes saved snapshots', async () => {
  const app = setup(true, 'SUBMITTED');
  const detail = await app.run(() => getOwnerCashUpDetail(app.meta.id));
  expect(detail.canReview).toBe(true); expect(detail.review?.status).toBe('SUBMITTED');
  expect(detail.review?.expectedUsd).toBeNull();
});
it('allows an eligible owner to decide another member request and denies inaccessible records', async () => {
  const app = setup();
  app.meta.requests[0].requestedById = 'other-member';
  expect((await app.run(() => getOwnerCashUpDetail(app.meta.id))).requests[0].canDecide).toBe(true);
  app.find.mockResolvedValueOnce(null);
  await expect(app.run(() => getOwnerCashUpDetail(app.meta.id))).rejects.toMatchObject({ code: 'ENTITY_NOT_FOUND' });
  for (const role of ['STAFF', 'MANAGER'] as const)
    await expect(withTestMember({ ...owner, role }, app.db, listOwnerCashUps)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  jest.spyOn(BusinessRepository.prototype, 'findSettings').mockRejectedValueOnce(new Error('Database unavailable'));
  await expect(app.run(listOwnerCashUps)).rejects.toThrow('Database unavailable');
});
