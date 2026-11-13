import { headers } from 'next/headers';
import { requestPasswordResetAction, verifyPasswordResetAction, resetPasswordAction } from '../../../src/app/(auth)/actions';
import * as recovery from '../../../src/modules/auth/password-recovery.service';
import { requestResetSchema, verifyResetSchema, resetPasswordSchema } from '../../../src/modules/auth/auth.validation';
import logger from '../../../src/lib/logger';
jest.mock('next/headers', () => ({ headers: jest.fn(), cookies: jest.fn() }));
jest.mock('next/navigation', () => ({ unstable_rethrow: jest.fn() }));
jest.mock('../../../src/lib/logger', () => ({ __esModule: true, default: { error: jest.fn() } }));
jest.mock('../../../src/modules/auth/password-recovery.service', () => ({
  ...jest.requireActual('../../../src/modules/auth/password-recovery.service'),
  requestPasswordReset: jest.fn(), verifyPasswordReset: jest.fn(), resetPassword: jest.fn(),
}));
beforeEach(() => {
  jest.resetAllMocks(); delete process.env.RECOVERY_IP_HEADER;
  jest.mocked(recovery.requestPasswordReset).mockResolvedValue(recovery.RESET_SENT_MESSAGE);
});
it('returns only the generic message and uses a shared fallback IP bucket', async () => {
  expect(await requestPasswordResetAction({ email: 'person@example.test' })).toEqual({ ok: true, message: recovery.RESET_SENT_MESSAGE });
  expect(recovery.requestPasswordReset).toHaveBeenCalledWith({ email: 'person@example.test' }, 'unknown');
});
it('uses only an explicitly configured trusted proxy header', async () => {
  process.env.RECOVERY_IP_HEADER = 'x-real-ip';
  jest.mocked(headers).mockResolvedValue(new Headers({ 'x-real-ip': '192.0.2.1' }) as never);
  await requestPasswordResetAction({ email: 'person@example.test' });
  expect(recovery.requestPasswordReset).toHaveBeenCalledWith({ email: 'person@example.test' }, '192.0.2.1');
});
it('exposes safe validation fields', async () => {
  jest.mocked(recovery.requestPasswordReset).mockImplementation(async input => { requestResetSchema.parse(input); return ''; });
  expect(await requestPasswordResetAction({ email: 'bad' })).toMatchObject({ ok: false, fields: { email: expect.any(String) } });
});
it('preserves recovery-specific code and confirmation fields through the shared auth error handler', async () => {
  jest.mocked(recovery.verifyPasswordReset).mockImplementation(async input => { verifyResetSchema.parse(input); });
  expect(await verifyPasswordResetAction({ email: 'person@example.test', code: 'bad' })).toMatchObject({ ok: false, fields: { code: expect.any(String) } });
  jest.mocked(recovery.resetPassword).mockImplementation(async input => { resetPasswordSchema.parse(input); });
  expect(await resetPasswordAction({ password: 'password123', confirmPassword: 'different' })).toMatchObject({ ok: false, fields: { confirmPassword: 'Passwords do not match.' } });
});
it('never returns reset authorization from verification or reset', async () => {
  expect(await verifyPasswordResetAction({ email: 'person@example.test', code: '012345' })).toEqual({ ok: true });
  expect(await resetPasswordAction({ password: 'password123', confirmPassword: 'password123' })).toEqual({ ok: true });
});
it('handles recovery failures safely', async () => {
  jest.mocked(recovery.verifyPasswordReset).mockRejectedValue(new recovery.RecoveryFailure());
  expect(await verifyPasswordResetAction({ email: 'person@example.test', code: '000000' })).toEqual({ ok: false, message: new recovery.RecoveryFailure().message });
});
it('redacts unexpected errors from logs and responses', async () => {
  jest.mocked(recovery.resetPassword).mockRejectedValue(new Error('password=secret code=123456'));
  expect(await resetPasswordAction({ password: 'password123', confirmPassword: 'password123' })).toEqual({ ok: false, message: 'Something went wrong. Please try again.' });
  expect(JSON.stringify(jest.mocked(logger.error).mock.calls)).not.toMatch(/secret|123456/);
});
