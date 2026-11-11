'use server';

import { redirect, unstable_rethrow } from 'next/navigation';
import { ZodError } from 'zod';
import { signup, login, logout, getCurrentUser, authDestination } from '../../modules/auth/auth.service';
import { AuthFailure, type AuthActionResult } from '../../modules/auth/auth.types';
import type { SignupInput, LoginInput } from '../../modules/auth/auth.validation';
import { reportUnexpectedAuthFailure } from '../../modules/auth/auth-diagnostics';

function failure(error: unknown, operation: 'signup' | 'login'): AuthActionResult {
  unstable_rethrow(error);
  if (error instanceof ZodError) {
    const fields: Partial<Record<'email' | 'password' | 'fullName', string>> = {};
    for (const issue of error.issues) {
      const key = issue.path[0];
      if (key === 'email' || key === 'password' || key === 'fullName') fields[key] ??= issue.message;
    }
    return { ok: false, message: 'Please check your details.', fields };
  }
  if (error instanceof AuthFailure) {
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
