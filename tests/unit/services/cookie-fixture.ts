import { cookies } from 'next/headers';
import type { CurrentUser } from '../../../src/modules/auth/auth.types';

export function cookieJar() {
  const values = new Map<string, string>();
  return {
    values,
    get: jest.fn((name: string) => values.has(name) ? { name, value: values.get(name)! } : undefined),
    set: jest.fn((name: string, value: string) => { values.set(name, value); }),
  };
}
export function useCookieJar(jar: ReturnType<typeof cookieJar>) {
  jest.mocked(cookies).mockResolvedValue(jar as unknown as Awaited<ReturnType<typeof cookies>>);
}
export const sessionUser: CurrentUser = { id: 'user', email: 'user@example.test', fullName: 'User', membership: { businessId: 'business', role: 'STAFF', status: 'ACTIVE' } };
