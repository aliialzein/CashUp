'use server';

import { redirect, unstable_rethrow } from 'next/navigation';
import { headers } from 'next/headers';
import { ZodError } from 'zod';
import { signup, login, logout, getCurrentUser, authDestination, changePassword } from '../../modules/auth/auth.service';
import { AuthFailure, type AuthActionResult } from '../../modules/auth/auth.types';
import type { SignupInput, LoginInput, RequestResetInput, VerifyResetInput, ResetPasswordInput, ChangePasswordInput } from '../../modules/auth/auth.validation';
import { requestPasswordReset, verifyPasswordReset, resetPassword, RecoveryFailure } from '../../modules/auth/password-recovery.service';
import { reportUnexpectedAuthFailure } from '../../modules/auth/auth-diagnostics';
import { UnauthenticatedError } from '../../shared/errors/service-errors';

type ActionFailure = { ok: false; message: string; code?: AuthFailure['code']; fields?: Record<string, string> };
type RecoveryResult = { ok: true; message?: string } | ActionFailure;
type AuthOperation = 'signup' | 'login' | 'password-change' | 'reset-request' | 'reset-verify' | 'reset-password';

const CURRENT_PASSWORD_WRONG = 'Current password is wrong.';

/** The failures a password change expects, each with the text the Change password form shows. */
function passwordChangeFailure(error: unknown): ActionFailure | null {
  if (error instanceof AuthFailure && error.code === 'INVALID_CREDENTIALS')
    return { ok: false, message: CURRENT_PASSWORD_WRONG, fields: { currentPassword: CURRENT_PASSWORD_WRONG } };
  if (error instanceof AuthFailure && error.code === 'TOO_MANY_ATTEMPTS')
    return { ok: false, message: 'Too many attempts. Please wait a few minutes before trying again.' };
  if (error instanceof UnauthenticatedError) return { ok: false, message: 'Your session has ended. Please sign in again.' };
  return null;
}

function failure(error: unknown, operation: AuthOperation): ActionFailure {
  unstable_rethrow(error);
  const isRecovery = operation.startsWith('reset-');
  const isPasswordChange = operation === 'password-change';
  if (error instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of error.issues) {
      const key = issue.path[0];
      if (isRecovery || isPasswordChange || key === 'email' || key === 'password' || key === 'fullName') fields[String(key)] ??= issue.message;
    }
    return { ok: false, message: 'Please check your details.', fields };
  }
  if (isRecovery && error instanceof RecoveryFailure) return { ok: false, message: error.message };
  const expectedPasswordChangeFailure = isPasswordChange ? passwordChangeFailure(error) : null;
  if (expectedPasswordChangeFailure) return expectedPasswordChangeFailure;
  if ((operation === 'signup' || operation === 'login') && error instanceof AuthFailure) {
    const messages = {
      INVALID_CREDENTIALS: 'Wrong email or password. Please check them and try again.',
      SIGNUP_UNAVAILABLE: 'Unable to create an account with these details. Try signing in if you already registered.',
      TOO_MANY_ATTEMPTS: 'Too many attempts. Please wait before trying again.',
      AUTH_UNAVAILABLE: 'Sign in and registration are temporarily unavailable. Please try again later.',
    };
    return { ok: false, message: messages[error.code], code: error.code };
  }
  reportUnexpectedAuthFailure(operation, error);
  return { ok: false, message: 'Something went wrong. Please try again.' };
}

export async function signupAction(input: SignupInput): Promise<AuthActionResult> {
  try {
    await signup(input);
    return { ok: true, destination: '/onboarding' };
  } catch (error) { return failure(error, 'signup'); }
}

export async function loginAction(input: LoginInput): Promise<AuthActionResult> {
  try {
    await login(input);
    const user = await getCurrentUser();
    if (!user) throw new AuthFailure('AUTH_UNAVAILABLE');
    return { ok: true, destination: authDestination(user) };
  } catch (error) { return failure(error, 'login'); }
}

export async function logoutAction(): Promise<void> {
  try { await logout(); }
  catch (error) {
    unstable_rethrow(error);
    reportUnexpectedAuthFailure('logout', error);
    throw new Error('Unable to sign out. Please try again.');
  }
  redirect('/login');
}

/** The signed-in member changes their password. This device stays signed in; every other device is signed out. */
export async function changePasswordAction(input: ChangePasswordInput): Promise<{ ok: true } | ActionFailure> {
  try { await changePassword(input); return { ok: true }; }
  catch (error) { return failure(error, 'password-change'); }
}

export async function requestPasswordResetAction(input: RequestResetInput): Promise<RecoveryResult> {
  try {
    // Only opt into a header overwritten by a trusted ingress. Never accept an IP from action input.
    const name = process.env.RECOVERY_IP_HEADER;
    const ip = name ? (await headers()).get(name)?.trim() : undefined;
    return { ok: true, message: await requestPasswordReset(input, ip?.slice(0, 200) || 'unknown') };
  } catch (error) { return failure(error, 'reset-request'); }
}

export async function verifyPasswordResetAction(input: VerifyResetInput): Promise<RecoveryResult> {
  try { await verifyPasswordReset(input); return { ok: true }; }
  catch (error) { return failure(error, 'reset-verify'); }
}

export async function resetPasswordAction(input: ResetPasswordInput): Promise<RecoveryResult> {
  try { await resetPassword(input); return { ok: true }; }
  catch (error) { return failure(error, 'reset-password'); }
}
