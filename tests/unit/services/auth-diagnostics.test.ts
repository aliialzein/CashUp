import { reportAuthTransactionFailure } from '../../../src/modules/auth/auth-diagnostics';
import logger from '../../../src/lib/logger';
jest.mock('../../../src/lib/logger', () => ({ __esModule: true, default: { error: jest.fn() } }));

it.each(['message', 'metadata'])('classifies P2028 acquisition failure from %s without logging original details', source => {
  const detail = 'Unable to start a transaction in the given time. password=secret postgresql://secret token=secret';
  const error = Object.assign(new Error(source === 'message' ? detail : 'redacted'), {
    code: 'P2028', meta: source === 'metadata' ? { error: detail } : {},
  });
  reportAuthTransactionFailure('login', 'login-session', error, { elapsedMs: 2010 });
  expect(logger.error).toHaveBeenCalledWith('Authentication transaction failed', {
    operation: 'login', stage: 'login-session', prismaCode: 'P2028', reason: 'ACQUISITION_TIMEOUT', phase: 'acquisition', elapsedMs: 2010,
  });
  expect(JSON.stringify(jest.mocked(logger.error).mock.calls)).not.toMatch(/secret|password|postgresql|token/);
});

it('distinguishes an expired transaction after callback entry', () => {
  reportAuthTransactionFailure('login', 'login-session', Object.assign(new Error('Transaction already closed: expired transaction'), { code: 'P2028' }), { elapsedMs: 5100, acquisitionMs: 50 });
  expect(logger.error).toHaveBeenCalledWith('Authentication transaction failed', expect.objectContaining({ reason: 'EXECUTION_TIMEOUT', phase: 'execution', acquisitionMs: 50 }));
});

it('ignores non-P2028 failures', () => {
  reportAuthTransactionFailure('login', 'login-session', new Error('secret'), { elapsedMs: 1 });
  expect(logger.error).not.toHaveBeenCalled();
});