export class UnauthenticatedError extends Error {
  constructor() {
    super('Authentication is required.');
    this.name = 'UnauthenticatedError';
  }
}

export class HttpRequestError extends Error {
  constructor(
    public readonly status: 400 | 413 | 415,
    public readonly code: 'INVALID_JSON' | 'UNSUPPORTED_MEDIA_TYPE' | 'PAYLOAD_TOO_LARGE',
    message: string,
  ) {
    super(message);
    this.name = 'HttpRequestError';
  }
}

export class IdempotencyKeyMismatchError extends Error {
  constructor() {
    super('The idempotency key was already used for a different request.');
    this.name = 'IdempotencyKeyMismatchError';
  }
}

export class IdempotencyInProgressError extends Error {
  constructor() {
    super('A request with this idempotency key is still in progress.');
    this.name = 'IdempotencyInProgressError';
  }
}
