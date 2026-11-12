import { withTestMember } from '../../support/service-context';
import type { Request } from '../../../src/generated/prisma/client';
import { SaleRepository } from '../../../src/modules/sales/sales.repository';
import { AuditRepository } from '../../../src/modules/audit/audit.repository';
import * as Sales from '../../../src/modules/sales/sales.service';
import { translatePersistenceError } from '../../../src/shared/errors/translate-persistence-error';
import { BusinessRuleError } from '../../../src/shared/errors/service-errors';
import { mockRepositories, testDatabase } from './repository-mocks';
import { actor, cashUp, sale, date } from './driver-fixtures';
const saleId = '20000000-0000-4000-8000-000000000001';
const requestId = '30000000-0000-4000-8000-000000000001';
afterEach(() => jest.restoreAllMocks());
function setup(options: { status?: Request['status']; saleStatus?: 'TO_DELIVER' | 'DELIVERED' | 'DELETED'; self?: boolean; solo?: boolean } = {}) {
  const row = sale({ id: saleId, status: options.saleStatus ?? 'DELIVERED', deletionAwaiting: true });
  const request: Request = { id: requestId, businessId: actor.businessId, type: 'DELETE_SALE', status: options.status ?? 'AWAITING_OWNER', reason: 'Customer cancelled', requestedById: actor.membershipId, cashUpId: row.cashUpId, saleId, decidedById: null, decisionReason: null, selfApproved: false, decidedAt: null, createdAt: date, updatedAt: date };
  mockRepositories({ businesses: { findSettings: async () => ({ id: actor.businessId, name: 'Shop', isSolo: options.solo ?? false }) }, cashUps: { lockForUpdate: async () => cashUp(), findOwn: async () => cashUp(), findById: async () => cashUp() }, sales: { findById: async () => row, countByStatus: async () => ({ total: 1, delivered: 1, toDeliver: 0, deleted: 0 }) } });
  jest.spyOn(SaleRepository.prototype, 'findDeletionRequest').mockResolvedValue(request);
  jest.spyOn(SaleRepository.prototype, 'listDeletionRequests').mockResolvedValue([request]);
  const mark = jest.spyOn(SaleRepository.prototype, 'markDeleted').mockResolvedValue({ ...row, status: 'DELETED', deletionAwaiting: false });
  const release = jest.spyOn(SaleRepository.prototype, 'releaseDeletionLock').mockResolvedValue({ ...row, deletionAwaiting: false });
  const lock = jest.spyOn(SaleRepository.prototype, 'lockForDeletion').mockResolvedValue(row);
  const create = jest.spyOn(SaleRepository.prototype, 'createDeletionRequest').mockResolvedValue(request);
  const resolve = jest.spyOn(SaleRepository.prototype, 'decideDeletionRequest').mockResolvedValue({ ...request, status: 'APPROVED' });
  const audit = jest.spyOn(AuditRepository.prototype, 'append').mockResolvedValue(undefined as never);
  const db = testDatabase();
  const owner = { ...actor, membershipId: options.self ? actor.membershipId : 'owner', role: 'OWNER' as const };
  return { mark, release, lock, create, resolve, audit, owner,
    decide: (decision: 'APPROVE' | 'REFUSE' = 'APPROVE') => withTestMember(owner, db, () => Sales.decideSaleDeletion(requestId, decision, 'Confirmed cancellation')),
    request: () => withTestMember(actor, db, () => Sales.requestSaleDeletion(row.cashUpId, saleId, 'Customer cancelled')),
  };
}
it('preserves the exact business-rule code through the existing error mapping', () => {
  const error = new BusinessRuleError('SALE_DELETION_REQUIRES_DELIVERED');
  expect(translatePersistenceError(error)).toBe(error);
});
it('rejects already decided requests before any write or audit', async () => {
  const app = setup({ status: 'REJECTED' });
  await expect(app.decide()).rejects.toMatchObject({ code: 'REQUEST_ALREADY_DECIDED' });
  for (const fn of [app.mark, app.release, app.resolve, app.audit]) expect(fn).not.toHaveBeenCalled();
});
it('rejects inconsistent sale state instead of rewriting financial history', async () => {
  const app = setup({ saleStatus: 'DELETED' });
  await expect(app.decide()).rejects.toMatchObject({ code: 'SALE_DELETION_STATE_CONFLICT' });
  expect(app.mark).not.toHaveBeenCalled(); expect(app.audit).not.toHaveBeenCalled();
});
it('rejects duplicate pending requests before flag/request/audit writes', async () => {
  const app = setup();
  await expect(app.request()).rejects.toMatchObject({ code: 'SALE_DELETION_REQUEST_EXISTS' });
  for (const fn of [app.lock, app.create, app.audit]) expect(fn).not.toHaveBeenCalled();
});
it('permits solo owner self-approval and records it on the decision and audit', async () => {
  const app = setup({ self: true, solo: true });
  await app.decide();
  expect(app.resolve).toHaveBeenCalledWith(requestId, true, actor.membershipId, 'Confirmed cancellation', true);
  expect(app.audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'REQUEST_APPROVED', metadata: expect.objectContaining({ selfApproved: true }) }));
});
it('blocks non-solo self-approval without writes', async () => {
  const app = setup({ self: true });
  await expect(app.decide()).rejects.toMatchObject({ code: 'REVIEW_NOT_ALLOWED' });
  expect(app.mark).not.toHaveBeenCalled(); expect(app.resolve).not.toHaveBeenCalled(); expect(app.audit).not.toHaveBeenCalled();
});
it('refusal releases only the request flag and never marks the sale deleted', async () => {
  const app = setup();
  await app.decide('REFUSE');
  expect(app.release).toHaveBeenCalledWith(saleId);
  expect(app.mark).not.toHaveBeenCalled();
  expect(app.resolve).toHaveBeenCalledWith(requestId, false, app.owner.membershipId, 'Confirmed cancellation', false);
  expect(app.audit).toHaveBeenCalledTimes(1);
});
