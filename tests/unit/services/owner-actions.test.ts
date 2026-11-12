import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { ZodError } from 'zod';
import * as auth from '../../../src/modules/auth/auth.service';
import * as cashUps from '../../../src/modules/cash-ups/cash-ups.service';
import * as sales from '../../../src/modules/sales/sales.service';
import { approveCashUpAction, returnCashUpAction, decideSaleDeletionAction } from '../../../src/app/(owner)/owner/actions';
import { BusinessRuleError, ConflictError, ForbiddenError } from '../../../src/shared/errors/service-errors';

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('next/navigation', () => ({ unstable_rethrow: jest.fn() }));
jest.mock('../../../src/modules/auth/auth.service', () => ({
  ...jest.requireActual('../../../src/modules/auth/auth.service'), requireCurrentMember: jest.fn(),
}));
jest.mock('../../../src/modules/cash-ups/cash-ups.service', () => ({ approveCashUp: jest.fn(), returnCashUpToOpen: jest.fn() }));
jest.mock('../../../src/modules/sales/sales.service', () => ({ decideSaleDeletion: jest.fn() }));
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(auth.requireCurrentMember).mockResolvedValue({ userId: 'session-user', membershipId: 'session-member', businessId: 'session-business', role: 'OWNER' });
  jest.mocked(cashUps.approveCashUp).mockResolvedValue({ id: 'real-cash-up' } as cashUpsReturn);
  jest.mocked(cashUps.returnCashUpToOpen).mockResolvedValue({ id: 'real-cash-up' } as cashUpsReturn);
});
type cashUpsReturn = Awaited<ReturnType<typeof cashUps.approveCashUp>>;

it('uses authenticated services and revalidates the returned record, lists and dashboard', async () => {
  expect(await approveCashUpAction('requested-id')).toEqual({ ok: true });
  expect(cashUps.approveCashUp).toHaveBeenCalledWith('requested-id');
  expect(jest.mocked(revalidatePath).mock.calls.map(call => call[0])).toEqual([
    '/owner', '/owner/cash-ups', '/owner/cash-ups/real-cash-up/review', '/owner/cash-ups/real-cash-up/sales',
  ]);
  expect(await returnCashUpAction('requested-id', '  Correction needed  ')).toEqual({ ok: true });
  expect(cashUps.returnCashUpToOpen).toHaveBeenCalledWith('requested-id', '  Correction needed  ');
});
it.each(['APPROVE', 'REFUSE'] as const)('delegates deletion %s without accepting a client actor or cash-up identity', async decision => {
  jest.mocked(sales.decideSaleDeletion).mockResolvedValue({ request: { cashUpId: 'real-parent' } } as Awaited<ReturnType<typeof sales.decideSaleDeletion>>);
  expect(await decideSaleDeletionAction('request-id', decision, 'Reason')).toEqual({ ok: true });
  expect(sales.decideSaleDeletion).toHaveBeenCalledWith('request-id', decision, 'Reason');
  expect(revalidatePath).toHaveBeenCalledWith('/owner/cash-ups/real-parent/review');
});
it.each(['MANAGER', 'STAFF'] as const)('rejects %s even when a control is called directly', async role => {
  jest.mocked(auth.requireCurrentMember).mockResolvedValue({ userId: 'u', membershipId: 'm', businessId: 'b', role });
  expect(await approveCashUpAction('id')).toMatchObject({ ok: false, code: 'FORBIDDEN' });
  expect(await decideSaleDeletionAction('request', 'APPROVE', 'Reason')).toMatchObject({ ok: false, code: 'FORBIDDEN' });
  expect(cashUps.approveCashUp).not.toHaveBeenCalled();
  expect(sales.decideSaleDeletion).not.toHaveBeenCalled();
});
it('preserves inactive-member and stale decision errors without invalidating data', async () => {
  jest.mocked(auth.requireCurrentMember).mockRejectedValueOnce(new ForbiddenError('ACTOR_NOT_ACTIVE'));
  expect(await approveCashUpAction('id')).toMatchObject({ ok: false, code: 'ACTOR_NOT_ACTIVE' });
  jest.mocked(sales.decideSaleDeletion).mockRejectedValueOnce(new ConflictError('REQUEST_ALREADY_DECIDED'));
  expect(await decideSaleDeletionAction('id', 'REFUSE', 'Reason')).toMatchObject({ ok: false, code: 'REQUEST_ALREADY_DECIDED' });
  jest.mocked(cashUps.returnCashUpToOpen).mockRejectedValueOnce(new BusinessRuleError('CASHUP_NOT_OPEN'));
  expect(await returnCashUpAction('id', 'Reason')).toMatchObject({ ok: false, code: 'CASHUP_NOT_OPEN' });
  expect(revalidatePath).not.toHaveBeenCalled();
});
it('returns stable field errors and sanitizes unexpected failures', async () => {
  jest.mocked(cashUps.returnCashUpToOpen).mockRejectedValueOnce(new ZodError([{ code: 'custom', path: ['reason'], message: 'REASON_TOO_SHORT' }]));
  expect(await returnCashUpAction('id', 'x')).toEqual({ ok: false, code: 'VALIDATION_ERROR', message: 'Please check your details.', fields: { reason: 'REASON_TOO_SHORT' } });
  jest.mocked(cashUps.approveCashUp).mockRejectedValueOnce(new Error('secret database details'));
  expect(await approveCashUpAction('id')).toEqual({ ok: false, code: 'UNEXPECTED_ERROR', message: 'Unable to save your decision. Please try again.' });
});
it('preserves framework redirect handling', async () => {
  const redirect = new Error('NEXT_REDIRECT');
  jest.mocked(cashUps.approveCashUp).mockRejectedValueOnce(redirect);
  jest.mocked(unstable_rethrow).mockImplementationOnce(error => { throw error; });
  await expect(approveCashUpAction('id')).rejects.toBe(redirect);
});
