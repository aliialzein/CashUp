import { redirect } from 'next/navigation';
import * as auth from '../../../src/modules/auth/auth.service';
import { AuthFailure } from '../../../src/modules/auth/auth.types';
import { signupSchema } from '../../../src/modules/auth/auth.validation';
import { signupAction, loginAction, logoutAction } from '../../../src/app/(auth)/actions';
import logger from '../../../src/lib/logger';
jest.mock('next/navigation', () => ({
  redirect: jest.fn(() => { throw new Error('REDIRECT'); }),
  unstable_rethrow: jest.fn((error: unknown) => {
    if (error instanceof Error && error.message === 'REDIRECT') throw error;
  }),
}));
jest.mock('../../../src/lib/logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));
jest.mock('../../../src/modules/auth/auth.service', () => ({
  ...jest.requireActual('../../../src/modules/auth/auth.service'),
  signup: jest.fn(), login: jest.fn(), logout: jest.fn(), getCurrentUser: jest.fn(),
}));
const input = { email: 'user@example.test', fullName: 'User', password: ' password123 ' };
beforeEach(() => {
  jest.mocked(auth.signup).mockReset().mockResolvedValue(undefined);
  jest.mocked(auth.login).mockReset().mockResolvedValue(undefined);
  jest.mocked(auth.logout).mockReset().mockResolvedValue(undefined);
  jest.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user', email: input.email, fullName: input.fullName, membership: null });
  jest.mocked(logger.error).mockClear();
});
it('connects signup to the auth service and the no-membership destination', async () => {
  expect(await signupAction(input)).toEqual({ ok: true, destination: '/onboarding' });
  expect(auth.signup).toHaveBeenCalledWith(input);
});
it.each([null, 'OWNER', 'MANAGER', 'STAFF'] as const)('routes login correctly for %s', async role => {
  jest.mocked(auth.getCurrentUser).mockResolvedValue({ id: 'user', email: input.email, fullName: input.fullName, membership: role ? { businessId: 'business', role, status: 'ACTIVE' } : null });
  expect(await loginAction({ email: input.email, password: input.password })).toEqual({ ok: true, destination: role === 'OWNER' ? '/owner' : '/onboarding' });
  expect(auth.login).toHaveBeenCalledWith({ email: input.email, password: input.password });
});
it('serializes safe field validation errors', async () => {
  jest.mocked(auth.signup).mockImplementation(async value => { signupSchema.parse(value); });
  expect(await signupAction({ ...input, email: 'invalid', password: 'short', fullName: '' })).toMatchObject({ ok: false, fields: { email: expect.any(String), password: expect.any(String), fullName: expect.any(String) } });
});
it.each(['INVALID_CREDENTIALS', 'SIGNUP_UNAVAILABLE', 'TOO_MANY_ATTEMPTS', 'AUTH_UNAVAILABLE'] as const)('returns a safe message for %s', async code => {
  jest.mocked(auth.login).mockRejectedValue(new AuthFailure(code));
  expect(await loginAction(input)).toEqual({ ok: false, code, message: expect.any(String) });
});
it('never exposes unexpected internal details', async () => {
  jest.mocked(auth.signup).mockRejectedValue(Object.assign(new Error('password=secret database URL'), { code: 'P1001' }));
  expect(await signupAction(input)).toEqual({ ok: false, message: 'Something went wrong. Please try again.' });
  expect(logger.error).toHaveBeenCalledWith('Unexpected authentication failure', {
    operation: 'signup',
    errorType: 'Error',
    prismaCode: 'P1001',
  });
  expect(JSON.stringify(jest.mocked(logger.error).mock.calls)).not.toMatch(/secret|password|database URL/i);
});
it('fails safely if a session cannot be read after login', async () => {
  jest.mocked(auth.getCurrentUser).mockResolvedValue(null);
  expect(await loginAction(input)).toMatchObject({ ok: false, code: 'AUTH_UNAVAILABLE' });
});
it('rethrows framework redirects rather than converting them to generic auth failures', async () => {
  jest.mocked(auth.signup).mockRejectedValue(new Error('REDIRECT'));
  await expect(signupAction(input)).rejects.toThrow('REDIRECT');
  expect(logger.error).not.toHaveBeenCalled();
});
it('revokes through a mutation action before redirecting to login', async () => {
  await expect(logoutAction()).rejects.toThrow('REDIRECT');
  expect(auth.logout).toHaveBeenCalledTimes(1);
  expect(redirect).toHaveBeenCalledWith('/login');
  expect(jest.mocked(auth.logout).mock.invocationCallOrder[0]).toBeLessThan(jest.mocked(redirect).mock.invocationCallOrder[0]);
});

it('redacts unexpected logout errors and does not report success', async () => {
  jest.mocked(auth.logout).mockRejectedValueOnce(new Error('database session secret'));
  await expect(logoutAction()).rejects.toThrow('Unable to sign out. Please try again.');
  expect(redirect).not.toHaveBeenCalled();
});
