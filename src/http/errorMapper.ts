import { ZodError } from 'zod';
import {
  BusinessRuleError,
  ConflictError,
  EntityNotFoundError,
  ForbiddenError,
} from '../services/errors';
import { toValidationError } from '../validation';
import {
  HttpRequestError,
  IdempotencyInProgressError,
  IdempotencyKeyMismatchError,
  UnauthenticatedError,
} from './errors';
import { jsonResponse } from './envelope';

export interface InternalErrorDetails {
  readonly requestId: string;
  readonly errorName: string;
  readonly errorMessage: string;
}

export type InternalErrorReporter = (details: InternalErrorDetails) => void;

export function mapHttpError(
  error: unknown,
  requestId: string,
  reportInternalError?: InternalErrorReporter,
): Response {
  if (error instanceof ZodError) {
    const validation = toValidationError(error);
    return jsonResponse(
      {
        error: {
          code: validation.code,
          message: 'Request validation failed.',
          details: validation.issues,
          requestId,
        },
      },
      400,
      requestId,
    );
  }

  if (error instanceof HttpRequestError) {
    return errorResponse(error.status, error.code, error.message, requestId);
  }
  if (error instanceof UnauthenticatedError) {
    return errorResponse(401, 'UNAUTHENTICATED', 'Authentication is required.', requestId);
  }
  if (error instanceof ForbiddenError) {
    return errorResponse(403, error.code, 'The operation is not permitted.', requestId);
  }
  if (error instanceof EntityNotFoundError) {
    return errorResponse(404, error.code, 'The requested resource was not found.', requestId);
  }
  if (error instanceof ConflictError) {
    return errorResponse(409, error.code, 'The operation conflicts with the current state.', requestId);
  }
  if (error instanceof BusinessRuleError) {
    return errorResponse(422, error.code, 'The operation violates a business rule.', requestId);
  }
  if (error instanceof IdempotencyKeyMismatchError) {
    return errorResponse(
      422,
      'IDEMPOTENCY_KEY_MISMATCH',
      'The idempotency key was already used for a different request.',
      requestId,
    );
  }
  if (error instanceof IdempotencyInProgressError) {
    return errorResponse(
      409,
      'IDEMPOTENCY_IN_PROGRESS',
      'A request with this idempotency key is still in progress.',
      requestId,
    );
  }

  reportInternalError?.({
    requestId,
    errorName: error instanceof Error ? error.name : 'UnknownError',
    errorMessage: 'Unhandled request failure.',
  });
  return errorResponse(500, 'INTERNAL_ERROR', 'An unexpected error occurred.', requestId);
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  requestId: string,
): Response {
  return jsonResponse({ error: { code, message, requestId } }, status, requestId);
}
