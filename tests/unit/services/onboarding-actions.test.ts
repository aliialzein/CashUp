import { joinBusinessAction } from '../../../src/app/(auth)/onboarding/actions';
import * as auth from '../../../src/modules/auth/auth.service';
import { redeemJoinCode } from '../../../src/modules/business/business.service';
import type { CurrentUser } from '../../../src/modules/auth/auth.types';

jest.mock('next/navigation', () => ({ unstable_rethrow: jest.fn() }));
jest.mock('../../../src/modules/auth/auth.service', () => ({
  ...jest.requireActual('../../../src/modules/auth/auth.service'),
  getCurrentUser: jest.fn(),
}));
jest.mock('../../../src/modules/business/business.service', () => ({
  createBusiness: jest.fn(), redeemJoinCode: jest.fn(),
}));

const user = (role: 'OWNER' | 'MANAGER' | 'STAFF', status: 'ACTIVE' | 'INACTIVE' = 'ACTIVE'): CurrentUser => ({
  id: 'session-user', email: 'user@example.test', fullName: 'User',
  membership: { businessId: 'session-business', role, status },
});
const form = () => {
  const value = new FormData();
  value.set('code', '23456789ABCD');
  value.set('userId', 'spoofed-user');
  value.set('businessId', 'spoofed-business');
  value.set('role', 'OWNER');
  return value;
};

beforeEach(() => {
  jest.mocked(auth.getCurrentUser).mockReset();
  jest.mocked(redeemJoinCode).mockReset();
});

it.each([
  [user('OWNER'), '/owner'],
  [user('STAFF'), '/onboarding'],
  [user('MANAGER'), '/onboarding'],
  [user('STAFF', 'INACTIVE'), '/onboarding'],
  [null, '/login'],
] as const)('uses the session destination after joining (%s)', async (current, destination) => {
  jest.mocked(auth.getCurrentUser).mockResolvedValue(current);
  expect(await joinBusinessAction(form())).toEqual({ destination });
  expect(redeemJoinCode).toHaveBeenCalledWith('23456789ABCD');
  expect(jest.mocked(redeemJoinCode).mock.invocationCallOrder[0]).toBeLessThan(jest.mocked(auth.getCurrentUser).mock.invocationCallOrder[0]);
});

it('returns a safe failure without resolving a destination when joining is rejected', async () => {
  jest.mocked(redeemJoinCode).mockRejectedValue(new Error('private database details'));
  expect(await joinBusinessAction(form())).toEqual({ message: 'Unable to join. Check the code with the business owner.' });
  expect(auth.getCurrentUser).not.toHaveBeenCalled();
});
