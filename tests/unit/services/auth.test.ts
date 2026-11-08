import { cookieJar, useCookieJar, sessionUser } from './cookie-fixture';
jest.mock('next/headers', () => ({ cookies: jest.fn() }));
import { requireCurrentIdentity, requireCurrentMember, lockCurrentMember, requireOwnCashUpPermission, requireManagementPermission, requireOwnerPermission } from '../../../src/modules/auth/auth.service';
import { findActiveMembership, lockMembership, readSession } from '../../../src/modules/auth/auth.repository';
import type { Db } from '../../../src/shared/db/types';
import type { CurrentMember } from '../../../src/modules/auth/auth.types';
jest.mock('../../../src/modules/auth/auth.repository', () => ({ findActiveMembership: jest.fn(), lockMembership: jest.fn(), readSession: jest.fn() }));
const member: CurrentMember = { userId: 'user', businessId: 'business', membershipId: 'member', role: 'STAFF' };
beforeEach(() => {
  const jar = cookieJar(); jar.values.set('cashup_session', 'a'.repeat(64)); useCookieJar(jar);
  jest.mocked(readSession).mockResolvedValue({ user: { id: sessionUser.id, email: sessionUser.email, fullName: sessionUser.fullName, memberships: [sessionUser.membership!] } });
  jest.mocked(findActiveMembership).mockResolvedValue({ id: 'member', userId: 'user', businessId: 'business', role: 'STAFF', status: 'ACTIVE' });
});
afterEach(() => jest.restoreAllMocks());
it('loads the scoped active membership independently for each call', async () => {
  await expect(requireCurrentMember()).resolves.toEqual(member);
  await requireCurrentMember();
  expect(findActiveMembership).toHaveBeenCalledTimes(2);
  expect(findActiveMembership).toHaveBeenCalledWith('user', 'business');
});
it('rejects a membership/role change detected inside the transaction', async () => {
  jest.mocked(lockMembership).mockResolvedValueOnce([]);
  await expect(lockCurrentMember(member, {} as Db)).rejects.toMatchObject({ code: 'ACTOR_NOT_ACTIVE' });
});
it('retains the matching membership lock through the workflow transaction', async () => {
  const tx = {} as Db;
  jest.mocked(lockMembership).mockResolvedValueOnce([{ id: member.membershipId }]);
  await expect(lockCurrentMember(member, tx)).resolves.toBeUndefined();
  expect(lockMembership).toHaveBeenCalledWith(member, tx);
});
it.each([undefined, 'malformed'])('fails closed for unsupported cookies %s', async token => {
  const jar = cookieJar(); if (token) jar.values.set('cashup_session', token); useCookieJar(jar);
  await expect(requireCurrentMember()).rejects.toMatchObject({ name: 'UnauthenticatedError' });
});
it('supports a session user without membership for business bootstrap', async () => {
  jest.mocked(readSession).mockResolvedValue({ user: { id: 'user', email: 'user@example.test', fullName: 'User', memberships: [] } });
  await expect(requireCurrentIdentity()).resolves.toEqual({ userId: 'user', businessId: undefined });
  await expect(requireCurrentMember()).rejects.toMatchObject({ name: 'UnauthenticatedError' });
});
it.each([null, { id: 'member', userId: 'other', businessId: 'business', role: 'STAFF' as const, status: 'ACTIVE' as const }, { id: 'member', userId: 'user', businessId: 'other', role: 'STAFF' as const, status: 'ACTIVE' as const }, { id: 'member', userId: 'user', businessId: 'business', role: 'STAFF' as const, status: 'INACTIVE' as const }])('rejects invalid membership %j', async row => {
  jest.mocked(findActiveMembership).mockResolvedValue(row);
  await expect(requireCurrentMember()).rejects.toMatchObject({ code: 'ACTOR_NOT_ACTIVE' });
});
it.each(['STAFF', 'MANAGER', 'OWNER'] as const)('preserves explicit role checks for %s', role => {
  const current = { ...member, role };
  if (role === 'OWNER') expect(() => requireOwnCashUpPermission(current, false)).toThrow();
  else requireOwnCashUpPermission(current, false);
  requireOwnCashUpPermission(current, true);
  if (role === 'STAFF') expect(() => requireManagementPermission(current)).toThrow();
  else requireManagementPermission(current);
  if (role !== 'OWNER') expect(() => requireOwnerPermission(current)).toThrow();
  else requireOwnerPermission(current);
});
