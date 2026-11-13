import logger from '../../lib/logger';

const PRISMA_ERROR_NAMES = new Set([
  'PrismaClientInitializationError',
  'PrismaClientKnownRequestError',
  'PrismaClientUnknownRequestError',
]);

/** Never emit free-form exception text, SQL, SMTP replies, stacks or configuration. */
export function sanitizedAuthError(error: unknown) {
  const value = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const rawMessage = typeof value.message === 'string' ? value.message : '';
  const safeCodes = /^(?:P\d{4}|E(?:AUTH|CONNECTION|CONNREFUSED|CONNRESET|TIMEDOUT|DNS|NOTFOUND|SOCKET|HOSTUNREACH|NETUNREACH|ACCES|PERM|TLS|PROTOCOL|MESSAGE|ENVELOPE|STREAM)|ERR_TLS_CERT_ALTNAME_INVALID|CERT_HAS_EXPIRED|DEPTH_ZERO_SELF_SIGNED_CERT|SELF_SIGNED_CERT_IN_CHAIN|UNABLE_TO_VERIFY_LEAF_SIGNATURE)$/;
  const code = typeof value.code === 'string' && safeCodes.test(value.code) ? value.code : null;
  const name = typeof value.name === 'string' && (PRISMA_ERROR_NAMES.has(value.name) || /^(?:Error|TypeError|RangeError|AggregateError|ZodError)$/.test(value.name)) ? value.name : 'Error';
  // Keep recognizable original diagnostic phrases, excluding arbitrary surrounding data.
  const phrases = [
    'Recovery secret is not configured', 'Recovery email is not configured', 'Recovery email delivery failed',
    'DATABASE_URL is not set', 'Application-specific password required', 'Username and Password not accepted',
    'Invalid login', 'Missing credentials', 'Connection timeout', 'Greeting never received',
    'Connection closed', 'Connection terminated', 'Socket timeout', 'self-signed certificate',
    'certificate has expired', 'unable to verify the first certificate',
    'getaddrinfo ENOTFOUND', 'connect ECONNREFUSED', 'connect ETIMEDOUT',
    'Unable to start a transaction in the given time', 'Transaction already closed',
  ];
  const message = phrases.find(phrase => rawMessage.includes(phrase))
    ?? (code?.startsWith('P') ? `Database operation failed (${code})` : 'Unrecognized exception text omitted for privacy');
  const rawCommand = typeof value.command === 'string' ? value.command.toUpperCase().split(/\s+/)[0] : '';
  const command = /^(?:CONN|AUTH|EHLO|HELO|STARTTLS|MAIL|RCPT|DATA|QUIT|RSET|NOOP)$/.test(rawCommand) ? rawCommand : null;
  const responseCode = typeof value.responseCode === 'number' && Number.isInteger(value.responseCode) && value.responseCode >= 100 && value.responseCode <= 599 ? value.responseCode : null;
  return { name, message, code, command, responseCode };
}

export function reportUnexpectedAuthFailure(operation: 'signup' | 'login' | 'logout' | 'reset-request' | 'reset-verify' | 'reset-password' | 'reset-email', error: unknown): void {
  const errorType = error instanceof Error
    ? PRISMA_ERROR_NAMES.has(error.name) ? error.name : error.name === 'ZodError' ? 'ZodError' : 'Error'
    : 'NonError';
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
  const prismaCode = typeof code === 'string' && /^P\d{4}$/.test(code) ? code : undefined;
  logger.error('Unexpected authentication failure', {
    operation,
    errorType,
    ...(prismaCode ? { prismaCode } : {}),
    ...(operation.startsWith('reset-') ? { error: sanitizedAuthError(error) } : {}),
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
