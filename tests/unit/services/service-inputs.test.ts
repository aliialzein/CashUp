import * as business from '../../../src/modules/business/business.service';
import * as cashUps from '../../../src/modules/cash-ups/cash-ups.service';
import * as sales from '../../../src/modules/sales/sales.service';
import * as cashOuts from '../../../src/modules/cash-outs/cash-outs.service';
import { withTestMember } from '../../support/service-context';
import { testDatabase } from './repository-mocks';
import { actor } from './driver-fixtures';
const id = '10000000-0000-4000-8000-000000000001';
const key = '20000000-0000-4000-8000-000000000001';
const cases: Array<[string, () => Promise<unknown>]> = [
  ['create business unknown role', () => business.createBusiness({ name: 'Business', role: 'OWNER' } as never)],
  ['create business blank name', () => business.createBusiness({ name: ' ', isSolo: false })],
  ['deactivate member id', () => business.deactivateMember('invalid')],
  ['replace manager id', () => business.replaceManager('invalid')],
  ['solo command', () => business.setBusinessSolo({ isSolo: 'false' } as never)],
  ['join code limits', () => business.createJoinCode({ maxUses: 0, expiresInDays: 7 })],
  ['revoke code id', () => business.revokeJoinCode('invalid')],
  ['redeem code format', () => business.redeemJoinCode('invalid')],
  ['open malformed money', () => cashUps.openCashUp({ floatUsd: 'abc' })],
  ['open negative money', () => cashUps.openCashUp({ floatLbp: '-1' })],
  ['open client number assignment', () => cashUps.openCashUp({ number: 99 } as never)],
  ['submit id', () => cashUps.submitCashUp('invalid')],
  ['approve id', () => cashUps.approveCashUp('invalid')],
  ['return id', () => cashUps.returnCashUpToOpen('invalid', 'Recount')],
  ['return reason', () => cashUps.returnCashUpToOpen(id, ' ')],
  ['void id', () => cashUps.voidOwnOpenCashUp('invalid', 'Cancel')],
  ['read count id', () => cashUps.getOwnCounts('invalid')],
  ['read detail id', () => cashUps.getOwnCashUp('invalid')],
  ['read review id', () => cashUps.getCashUpReview('invalid')],
  ['count quantities', () => cashUps.replaceOwnCounts(id, { lines: [{ currency: 'USD', denomination: '1.00', quantity: -1 }] })],
  ['count duplicates', () => cashUps.replaceOwnCounts(id, { lines: Array(2).fill({ currency: 'USD', denomination: '1.00', quantity: 0 }) })],
  ['history page limit', () => cashUps.listOwnCashUps({ take: 101 })],
  ['history cursor', () => cashUps.listOwnCashUps({ take: 10, cursorId: 'invalid' })],
  ['review date range', () => cashUps.listReviewedCashUps({ take: 10, from: '2026-11-02', to: '2026-11-01' })],
  ['create sale id', () => sales.createSale('invalid', {} as never)],
  ['create sale missing command', () => sales.createSale(id, undefined as never)],
  ['create sale malformed money', () => sales.createSale(id, { idempotencyKey: key, businessAmountUsd: 'abc', method: 'CASH', status: 'DELIVERED' } as never)],
  ['edit sale id', () => sales.editSale(id, 'invalid', { note: 'note' })],
  ['edit sale unknown fields', () => sales.editSale(id, id, { businessId: id } as never)],
  ['edit sale malformed money', () => sales.editSale(id, id, { tipUsd: 'abc' })],
  ['delivery negative money', () => sales.confirmSaleDelivery(id, id, { totalCollectedUsd: '-1', method: 'CASH' } as never)],
  ['cancel sale reason', () => sales.cancelSale(id, id, ' ')],
  ['create cash-out id', () => cashOuts.createCashOut('invalid', {} as never)],
  ['create cash-out missing command', () => cashOuts.createCashOut(id, undefined as never)],
  ['create cash-out zero', () => cashOuts.createCashOut(id, { idempotencyKey: key, amountUsd: '0.00', amountLbp: '0.00', reason: 'Fuel' })],
  ['cancel cash-out id', () => cashOuts.cancelCashOut(id, 'invalid', 'Cancel')],
  ['cancel cash-out reason', () => cashOuts.cancelCashOut(id, id, ' ')],
];
it.each(cases)('validates direct service input before persistence: %s', async (_name, operation) => {
  const db = testDatabase();
  await expect(withTestMember(actor, db, operation)).rejects.toMatchObject({ name: 'ZodError' });
  expect(db.$transaction).not.toHaveBeenCalled();
});
