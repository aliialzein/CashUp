import { createElement } from 'react';
import { redirect } from 'next/navigation';
import RequireAnonymous from '../../../src/components/auth/RequireAnonymous';
import * as auth from '../../../src/modules/auth/auth.service';

jest.mock('next/navigation', () => ({
  redirect: jest.fn((destination: string) => { throw new Error(`REDIRECT:${destination}`); }),
}));
jest.mock('../../../src/modules/auth/auth.service', () => ({
  ...jest.requireActual('../../../src/modules/auth/auth.service'),
  getCurrentUser: jest.fn(),
}));

const user = (role: 'OWNER' | 'MANAGER' | 'STAFF', status: 'ACTIVE' | 'INACTIVE' = 'ACTIVE') => ({
  id: 'user',
  email: 'user@example.test',
  fullName: 'User',
  membership: { businessId: 'business', role, status },
});

beforeEach(() => {
  jest.mocked(auth.getCurrentUser).mockReset();
  jest.mocked(redirect).mockClear();
});

it('allows anonymous users to render auth pages', async () => {
  jest.mocked(auth.getCurrentUser).mockResolvedValue(null);
  const content = createElement('div', null, 'login');
  await expect(RequireAnonymous({ children: content })).resolves.toBe(content);
});

it.each([
  [user('OWNER'), '/owner'],
  [user('MANAGER'), '/onboarding'],
  [user('STAFF'), '/onboarding'],
  [user('OWNER', 'INACTIVE'), '/onboarding'],
] as const)('redirects authenticated users consistently to %s', async (currentUser, destination) => {
  jest.mocked(auth.getCurrentUser).mockResolvedValue(currentUser);
  await expect(RequireAnonymous({ children: createElement('div', null, 'auth') })).rejects.toThrow(`REDIRECT:${destination}`);
  expect(redirect).toHaveBeenCalledWith(destination);
});
