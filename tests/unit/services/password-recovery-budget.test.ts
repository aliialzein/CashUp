import { consumeRecoveryBudget } from '../../../src/modules/auth/password-recovery.repository';
import type { Db } from '../../../src/shared/db/types';

const attempts = { deleteMany: jest.fn(), upsert: jest.fn(), findUnique: jest.fn(), create: jest.fn() };
const lock = jest.fn();
const tx = { $executeRaw: lock, authAttempt: attempts } as unknown as Db;
beforeEach(() => {
  jest.resetAllMocks();
  attempts.upsert.mockResolvedValue({ attempts: 1 });
  attempts.findUnique.mockResolvedValue(null);
});
it('persists shared limits and a sixty-second cooldown with hashed keys', async () => {
  const start = Date.now();
  expect(await consumeRecoveryBudget('email-digest', 'ip-digest', tx)).toBe(true);
  expect(lock).toHaveBeenCalledTimes(1);
  expect(attempts.upsert.mock.calls.map(call => call[0].where.key)).toEqual(['reset:global', 'reset:ip:ip-digest', 'reset:e:email-digest']);
  expect(attempts.upsert.mock.calls[0][0].create.expiresAt.getTime()).toBeGreaterThanOrEqual(start + 3600000);
  expect(attempts.create.mock.calls[0][0].data.expiresAt.getTime() - start).toBeGreaterThanOrEqual(60000);
  expect(attempts.deleteMany).toHaveBeenCalledWith({ where: { expiresAt: { lte: expect.any(Date) }, key: { startsWith: 'reset:' } } });
});
it.each([
  { counts: [1001], queries: 1 },
  { counts: [1, 31], queries: 2 },
  { counts: [1, 1, 6], queries: 3 },
])('rejects exhausted global, IP and email budgets before allocating more keys: %j', async ({ counts, queries }) => {
  for (const count of counts) attempts.upsert.mockResolvedValueOnce({ attempts: count });
  expect(await consumeRecoveryBudget('email', 'ip', tx)).toBe(false);
  expect(attempts.upsert).toHaveBeenCalledTimes(queries);
  expect(attempts.create).not.toHaveBeenCalled();
});
it('rejects cooldown requests without changing the cooldown expiry', async () => {
  attempts.findUnique.mockResolvedValue({ attempts: 1 });
  expect(await consumeRecoveryBudget('email', 'ip', tx)).toBe(false);
  expect(attempts.create).not.toHaveBeenCalled();
});
