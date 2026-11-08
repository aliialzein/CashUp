import { jest } from '@jest/globals';
import { serviceTestScope } from './service-context';
import { currentSessionCookies } from './session-cookies';
jest.unstable_mockModule('next/server', () => ({ connection: async () => undefined }));
jest.unstable_mockModule('next/headers', () => ({ cookies: async () => currentSessionCookies() }));

const database = await import('../../src/shared/db/prisma');
const auth = await import('../../src/modules/auth/auth.service');

jest.unstable_mockModule('../../src/shared/db/prisma', () => ({
  ...database,
  getPrisma: () => serviceTestScope.getStore()?.db ?? database.getPrisma(),
}));

jest.unstable_mockModule('../../src/modules/auth/auth.service', () => ({
  ...auth,
  requireCurrentIdentity: async () => serviceTestScope.getStore()?.identity ?? auth.requireCurrentIdentity(),
  // Integration fixtures supply identity only; membership is still checked in PostgreSQL.
  requireCurrentMember: async () => {
    const scope = serviceTestScope.getStore();
    return scope ? auth.resolveMember(scope.identity) : auth.requireCurrentMember();
  },
}));

afterAll(async () => { await database.closePrisma(); });
