import * as auth from '../../../src/modules/auth/auth.service';
import { AuthFailure } from '../../../src/modules/auth/auth.types';
import { changePasswordSchema } from '../../../src/modules/auth/auth.validation';
import { UnauthenticatedError } from '../../../src/shared/errors/service-errors';
import { changePasswordAction } from '../../../src/app/(auth)/actions';
import logger from '../../../src/lib/logger';
jest.mock('next/navigation', () => ({ redirect: jest.fn(), unstable_rethrow: jest.fn() }));
jest.mock('../../../src/lib/logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));
jest.mock('../../../src/modules/auth/auth.service', () => ({
  ...jest.requireActual('../../../src/modules/auth/auth.service'),
  changePassword: jest.fn(),
}));

const input = { currentPassword: 'Old-password1!', newPassword: 'New-password2!' };
beforeEach(() => {
  jest.mocked(auth.changePassword).mockReset().mockResolvedValue(undefined);
  jest.mocked(logger.error).mockClear();
});

it('changes the password through the auth service', async () => {
  expect(await changePasswordAction(input)).toEqual({ ok: true });
  expect(auth.changePassword).toHaveBeenCalledWith(input);
});

it('puts a wrong current password under its field', async () => {
  jest.mocked(auth.changePassword).mockRejectedValue(new AuthFailure('INVALID_CREDENTIALS'));
  expect(await changePasswordAction(input)).toEqual({
    ok: false,
    message: 'Current password is wrong.',
    fields: { currentPassword: 'Current password is wrong.' },
  });
});

it('asks to wait after too many attempts', async () => {
  jest.mocked(auth.changePassword).mockRejectedValue(new AuthFailure('TOO_MANY_ATTEMPTS'));
  expect(await changePasswordAction(input)).toEqual({
    ok: false,
    message: 'Too many attempts. Please wait a few minutes before trying again.',
  });
});

it('asks to sign in again when the session has ended', async () => {
  jest.mocked(auth.changePassword).mockRejectedValue(new UnauthenticatedError());
  expect(await changePasswordAction(input)).toEqual({ ok: false, message: 'Your session has ended. Please sign in again.' });
});

it('returns a message for every field the validation refuses', async () => {
  jest.mocked(auth.changePassword).mockImplementation(async value => { changePasswordSchema.parse(value); });
  expect(await changePasswordAction({ currentPassword: '', newPassword: 'short' })).toMatchObject({
    ok: false,
    fields: { currentPassword: expect.any(String), newPassword: expect.any(String) },
  });
  expect(await changePasswordAction({ currentPassword: 'Same-password1!', newPassword: 'Same-password1!' })).toMatchObject({
    ok: false,
    fields: { newPassword: 'Choose a different password.' },
  });
  expect(logger.error).not.toHaveBeenCalled();
});

it('never exposes unexpected internal details, and reports them as a password change', async () => {
  jest.mocked(auth.changePassword).mockRejectedValue(Object.assign(new Error('password=secret database URL'), { code: 'P1001' }));
  expect(await changePasswordAction(input)).toEqual({ ok: false, message: 'Something went wrong. Please try again.' });
  expect(logger.error).toHaveBeenCalledWith('Unexpected authentication failure', {
    operation: 'password-change',
    errorType: 'Error',
    prismaCode: 'P1001',
  });
  expect(JSON.stringify(jest.mocked(logger.error).mock.calls)).not.toMatch(/secret|database URL/i);
});
