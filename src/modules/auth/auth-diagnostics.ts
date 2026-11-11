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
