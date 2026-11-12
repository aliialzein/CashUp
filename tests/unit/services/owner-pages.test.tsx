import { renderToStaticMarkup } from 'react-dom/server';
import { notFound, redirect } from 'next/navigation';
import { ownerCashUpPage } from '../../../src/app/(owner)/owner/queries';
import { getOwnerCashUpDetail } from '../../../src/modules/cash-ups/cash-ups.service';
import { EntityNotFoundError, UnauthenticatedError } from '../../../src/shared/errors/service-errors';
import { ownerLedger, ownerMoney } from '../../../src/components/owner/owner-format';
import CashSummary from '../../../src/components/owner/cash-up-review/CashSummary';
import CashUpSalesList from '../../../src/components/owner/cash-up-sales/CashUpSalesList';
import type { CashUpReviewDto, OwnerCashUpDetailDto } from '../../../src/modules/cash-ups/cash-ups.types';

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => { throw new Error('NOT_FOUND'); }), redirect: jest.fn(path => { throw new Error('REDIRECT:' + path); }), useRouter: jest.fn(),
}));
jest.mock('../../../src/modules/cash-ups/cash-ups.service', () => ({ getOwnerCashUpDetail: jest.fn() }));

export function reviewFixture(): CashUpReviewDto {
  return {
    id: 'cash-up', number: 1, status: 'APPROVED', openedAt: '2026-11-12T10:00:00Z', closedAt: '2026-11-12T11:00:00Z',
    countStartedAt: null, approvedAt: null, approvedById: null, voidedAt: null, selfApproved: false, returnReason: null, voidReason: null,
    floatUsd: '20.00', floatLbp: '0.00', referenceRate: '89500.00',
    expectedUsd: '123.45', expectedLbp: '2000.00', countedUsd: '120.00', countedLbp: '2000.00', gapUsd: '-3.45', gapLbp: '0.00',
    sales: [{ id: 'pending', saleNumber: 1, status: 'TO_DELIVER', moneyTaken: 'NOT_YET',
      businessAmountUsd: '10.00', businessAmountLbp: '1000.00', deliveryFeeUsd: '2.00', deliveryFeeLbp: '0.00',
      discountUsd: '0.00', discountLbp: '0.00', totalCollectedUsd: null, totalCollectedLbp: null,
      tipUsd: null, tipLbp: null, changeGivenUsd: null, changeGivenLbp: null, method: null,
      clientNumber: '+961123456', note: null, createdAt: '2026-11-12T10:00:00Z', deliveredAt: null, cancelReason: null,
      isEdited: false, amountDiffers: false, deletionAwaiting: false }],
    requests: [], salesSummary: { total: 1, delivered: 0, deleted: 0, toDeliver: 1 }, cashOuts: [], countEntries: [],
    salesByCurrency: { USD: { businessAmount: '0.00', deliveryFees: '0.00', totalCollected: '0.00', tips: '0.00', discounts: '0.00', changeGiven: '0.00' }, LBP: { businessAmount: '0.00', deliveryFees: '0.00', totalCollected: '0.00', tips: '0.00', discounts: '0.00', changeGiven: '0.00' } },
    walletTotals: { WHISH: { USD: '0.00', LBP: '0.00' }, OMT: { USD: '0.00', LBP: '0.00' } },
    expectedAndGap: { USD: { expected: '20.00', counted: '0.00', gap: '-20.00', direction: 'SHORT', display: '-20.00' }, LBP: { expected: '0.00', counted: '0.00', gap: '0.00', direction: 'EVEN', display: '0.00' } },
    flags: { total: 1, deleted: 0, edited: 0, amountDiffers: 0, deletionAwaiting: 0 },
  };
}
it('preserves exact strings, pending nulls and saved historical snapshots separately from the live ledger', () => {
  const review = reviewFixture();
  expect(ownerMoney('9007199254740993.01')).toBe('9,007,199,254,740,993.01');
  expect(ownerLedger(review).expectedUsd).toBe('20.00');
  expect(review.sales[0].totalCollectedUsd).toBeNull();
  expect(review.sales[0].method).toBeNull();
  const html = renderToStaticMarkup(<CashSummary cashUp={review} />);
  expect(html).toContain('Saved expected'); expect(html).toContain('123.45');
  expect(html).toContain('Calculated cash ledger'); expect(html).toContain('20.00');
  const detail: OwnerCashUpDetailDto = { id: review.id, number: 1, status: 'APPROVED', openedAt: review.openedAt,
    staffName: 'Manager', salesCount: 1, returnReason: null, voidReason: null, canReview: true, requests: [], review, edits: [] };
  const salesHtml = renderToStaticMarkup(<CashUpSalesList cashUp={detail} />);
  expect(salesHtml).toContain('Not collected'); expect(salesHtml).not.toContain('>Cash<');
});
it('maps inaccessible records to not-found and anonymous requests to login', async () => {
  jest.mocked(getOwnerCashUpDetail).mockRejectedValueOnce(new EntityNotFoundError());
  await expect(ownerCashUpPage('foreign-id')).rejects.toThrow('NOT_FOUND');
  expect(notFound).toHaveBeenCalled();
  jest.mocked(getOwnerCashUpDetail).mockRejectedValueOnce(new UnauthenticatedError());
  await expect(ownerCashUpPage('id')).rejects.toThrow('REDIRECT:/login'); expect(redirect).toHaveBeenCalledWith('/login');
});
it('propagates backend failures to the page error boundary without mock fallback', async () => {
  jest.mocked(getOwnerCashUpDetail).mockRejectedValueOnce(new Error('Database unavailable'));
  await expect(ownerCashUpPage('id')).rejects.toThrow('Database unavailable');
});
