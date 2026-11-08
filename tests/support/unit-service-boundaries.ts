import { serviceTestScope } from './service-context';

jest.mock('next/server', () => ({
  ...jest.requireActual('next/server'),
  connection: jest.fn(async () => undefined),
}));

jest.mock('../../src/shared/db/prisma', () => {
  const actual = jest.requireActual<typeof import('../../src/shared/db/prisma')>('../../src/shared/db/prisma');
  return { ...actual, getPrisma: () => serviceTestScope.getStore()?.db ?? actual.getPrisma() };
});

jest.mock('../../src/modules/auth/auth.service', () => {
  const actual = jest.requireActual<typeof import('../../src/modules/auth/auth.service')>('../../src/modules/auth/auth.service');
  return {
    ...actual,
    requireCurrentIdentity: async () => serviceTestScope.getStore()?.identity ?? actual.requireCurrentIdentity(),
    requireCurrentMember: async () => serviceTestScope.getStore()?.member ?? actual.requireCurrentMember(),
    lockCurrentMember: (...args: Parameters<typeof actual.lockCurrentMember>) =>
      serviceTestScope.getStore() ? Promise.resolve() : actual.lockCurrentMember(...args),
  };
});
