import logger from '../../lib/logger';

const PRISMA_ERROR_NAMES = new Set([
  'PrismaClientInitializationError',
  'PrismaClientKnownRequestError',
  'PrismaClientUnknownRequestError',
]);

export function reportUnexpectedAuthFailure(operation: 'signup' | 'login' | 'logout', error: unknown): void {
  const errorType = error instanceof Error
    ? PRISMA_ERROR_NAMES.has(error.name) ? error.name : error.name === 'ZodError' ? 'ZodError' : 'Error'
    : 'NonError';
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
  const prismaCode = typeof code === 'string' && /^P\d{4}$/.test(code) ? code : undefined;
  logger.error('Unexpected authentication failure', {
    operation,
    errorType,
    ...(prismaCode ? { prismaCode } : {}),
  });
}

export function reportAuthTransactionFailure(
  operation: 'signup' | 'login',
  stage: 'signup-session' | 'login-session',
  error: unknown,
  timing: { elapsedMs: number; acquisitionMs?: number },
): void {
  if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'P2028') return;
  const meta = 'meta' in error && error.meta && typeof error.meta === 'object' ? error.meta : null;
  const explanation = meta && 'error' in meta && typeof meta.error === 'string' ? meta.error : error instanceof Error ? error.message : '';
  // Interpret known engine phrases, never emit the original message or metadata.
  const reason = /Unable to start a transaction/i.test(explanation) ? 'ACQUISITION_TIMEOUT'
    : /expired transaction|transaction.*expired|timeout.*transaction/i.test(explanation) ? 'EXECUTION_TIMEOUT'
    : /closed/i.test(explanation) ? 'TRANSACTION_CLOSED' : 'UNKNOWN';
  const diagnostic = {
    operation, stage, prismaCode: 'P2028', reason,
    phase: timing.acquisitionMs === undefined ? 'acquisition' : 'execution',
    elapsedMs: timing.elapsedMs,
    ...(timing.acquisitionMs === undefined ? {} : { acquisitionMs: timing.acquisitionMs }),
  };
  logger.error('Authentication transaction failed', diagnostic);
}
