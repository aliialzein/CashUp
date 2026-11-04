import { z } from 'zod';
import {
  BusinessRuleError,
  ConflictError,
  EntityNotFoundError,
  ForbiddenError,
} from '../../services/errors';
import {
  DevHeaderSessionProvider,
  HttpRequestError,
  IdempotencyInProgressError,
  IdempotencyKeyMismatchError,
  InMemoryIdempotencyStore,
  UnauthenticatedError,
  getRequestId,
  hashCanonicalBody,
  mapHttpError,
  readJsonBody,
  jsonResponse,
} from '..';

const requestId = 'cfd0db5d-cd96-4f5c-bb34-88d08e0748a8';

describe('HTTP error mapping', () => {
  it('maps validation errors without echoing submitted values', async () => {
    const result = z
      .object({ amount: z.string() })
      .strict()
      .safeParse({ amount: 'secret amount', businessId: 'secret business' });
    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected validation to fail.');
    const response = mapHttpError(result.error, requestId);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details).toBeDefined();
    expect(JSON.stringify(body)).not.toContain('secret amount');
    expect(JSON.stringify(body)).not.toContain('secret business');
  });

  it.each([
    [new UnauthenticatedError(), 401, 'UNAUTHENTICATED'],
    [new ForbiddenError('REVIEW_NOT_ALLOWED'), 403, 'REVIEW_NOT_ALLOWED'],
    [new EntityNotFoundError(), 404, 'ENTITY_NOT_FOUND'],
    [new ConflictError('CASHUP_STATE_CONFLICT'), 409, 'CASHUP_STATE_CONFLICT'],
    [new BusinessRuleError('SALES_AWAITING_DELIVERY'), 422, 'SALES_AWAITING_DELIVERY'],
    [new IdempotencyKeyMismatchError(), 422, 'IDEMPOTENCY_KEY_MISMATCH'],
    [new IdempotencyInProgressError(), 409, 'IDEMPOTENCY_IN_PROGRESS'],
    [new HttpRequestError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be JSON.'), 415, 'UNSUPPORTED_MEDIA_TYPE'],
    [new HttpRequestError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large.'), 413, 'PAYLOAD_TOO_LARGE'],
    [new HttpRequestError(400, 'INVALID_JSON', 'Request body is not valid JSON.'), 400, 'INVALID_JSON'],
  ])('maps %s to %s', async (error, status, code) => {
    const response = mapHttpError(error, requestId);
    const body = await response.json();
    expect(response.status).toBe(status);
    expect(body.error.code).toBe(code);
  });

  it('maps an unexpected error to a generic 500 and logs no internal message', async () => {
    const report = jest.fn();
    const response = mapHttpError(new Error('database secret'), requestId, report);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(body)).not.toContain('database secret');
    expect(report).toHaveBeenCalledWith({
      requestId,
      errorName: 'Error',
      errorMessage: 'Unhandled request failure.',
    });
    expect(JSON.stringify(report.mock.calls)).not.toContain('database secret');
  });
});

describe('readJsonBody', () => {
  it('accepts empty bodies', async () => {
    await expect(readJsonBody(new Request('http://localhost'))).resolves.toBeUndefined();
  });

  it('rejects a non-JSON body', async () => {
    const request = new Request('http://localhost', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'not json',
    });
    await expect(readJsonBody(request)).rejects.toMatchObject({
      status: 415,
      code: 'UNSUPPORTED_MEDIA_TYPE',
    });
  });

  it('rejects an oversized declared length before reading the body', async () => {
    const request = new Request('http://localhost', {
      method: 'POST',
      headers: {
        'content-length': String(65 * 1024),
        'content-type': 'application/json',
      },
      body: '{}',
    });
    await expect(readJsonBody(request)).rejects.toMatchObject({
      status: 413,
      code: 'PAYLOAD_TOO_LARGE',
    });
  });

  it('rejects a body with no content type', async () => {
    const request = new Request('http://localhost', {
      method: 'POST',
      body: '{}',
    });
    await expect(readJsonBody(request)).rejects.toMatchObject({
      status: 415,
      code: 'UNSUPPORTED_MEDIA_TYPE',
    });
  });

  it('rejects bodies larger than 64 KiB', async () => {
    const request = new Request('http://localhost', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ value: 'x'.repeat(65 * 1024) }),
    });
    await expect(readJsonBody(request)).rejects.toMatchObject({
      status: 413,
      code: 'PAYLOAD_TOO_LARGE',
    });
  });

  it('rejects malformed JSON without returning its content', async () => {
    const request = new Request('http://localhost', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"secret":',
    });
    await expect(readJsonBody(request)).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_JSON',
      message: 'Request body is not valid JSON.',
    });
  });

  it('rejects non-UTF-8 request bodies', async () => {
    const request = new Request('http://localhost', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: Uint8Array.of(0xff),
    });
    await expect(readJsonBody(request)).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_JSON',
    });
  });

  it('parses valid JSON', async () => {
    const request = new Request('http://localhost', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"value":1}',
    });
    await expect(readJsonBody(request)).resolves.toEqual({ value: 1 });
  });
});

describe('response envelope and request ids', () => {
  it('sets the required response headers', () => {
    const response = jsonResponse({ data: true }, 200, requestId);
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-request-id')).toBe(requestId);
  });

  it('accepts a well-formed inbound UUID and replaces an invalid request id', () => {
    expect(
      getRequestId(new Request('http://localhost', { headers: { 'x-request-id': requestId } })),
    ).toBe(requestId);

    const generated = getRequestId(
      new Request('http://localhost', { headers: { 'x-request-id': 'not-a-uuid' } }),
    );
    expect(z.uuid().safeParse(generated).success).toBe(true);
  });
});

describe('development session stub', () => {
  it('fails closed in production and when the flag is disabled', async () => {
    const request = new Request('http://localhost', {
      headers: {
        'x-dev-user-id': 'user',
        'x-dev-business-id': 'business',
      },
    });
    const production = new DevHeaderSessionProvider({ nodeEnv: 'production', enabled: '1' });
    const disabled = new DevHeaderSessionProvider({ nodeEnv: 'development', enabled: '0' });

    await expect(production.getSession(request)).rejects.toBeInstanceOf(UnauthenticatedError);
    await expect(disabled.getSession(request)).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it('reads the development headers only when explicitly enabled outside production', async () => {
    const provider = new DevHeaderSessionProvider({ nodeEnv: 'test', enabled: '1' });
    await expect(
      provider.getSession(
        new Request('http://localhost', {
          headers: {
            'x-dev-user-id': 'user',
            'x-dev-business-id': 'business',
          },
        }),
      ),
    ).resolves.toEqual({ userId: 'user', businessId: 'business' });
  });

  it('rejects incomplete development identity headers', async () => {
    const provider = new DevHeaderSessionProvider({ nodeEnv: 'test', enabled: '1' });
    await expect(
      provider.getSession(
        new Request('http://localhost', { headers: { 'x-dev-user-id': 'user' } }),
      ),
    ).rejects.toBeInstanceOf(UnauthenticatedError);
  });
});

describe('in-memory idempotency store', () => {
  it('supports new, replay, mismatch, in-progress, and abandon states', async () => {
    const store = new InMemoryIdempotencyStore();
    const hash = hashCanonicalBody({ b: 2, a: 1 });
    expect(hash).toBe(hashCanonicalBody({ a: 1, b: 2 }));

    await expect(store.begin('scope', 'key_12345', hash)).resolves.toEqual({ state: 'new' });
    await expect(store.begin('scope', 'key_12345', hash)).resolves.toEqual({
      state: 'in_progress',
    });
    await expect(store.begin('scope', 'key_12345', 'different')).resolves.toEqual({
      state: 'mismatch',
    });
    await store.complete('scope', 'key_12345', 201, { data: { id: 'id' } }, { Location: '/id' });
    await expect(store.begin('scope', 'key_12345', hash)).resolves.toEqual({
      state: 'replay',
      status: 201,
      body: { data: { id: 'id' } },
      headers: { Location: '/id' },
    });

    await store.abandon('scope', 'key_12345');
    await expect(store.begin('scope', 'key_12345', hash)).resolves.toEqual({
      state: 'replay',
      status: 201,
      body: { data: { id: 'id' } },
      headers: { Location: '/id' },
    });
    await expect(store.begin('scope', 'retry_1234', hash)).resolves.toEqual({ state: 'new' });
    await store.abandon('scope', 'retry_1234');
    await expect(store.begin('scope', 'retry_1234', hash)).resolves.toEqual({ state: 'new' });
  });

  it('rejects completion without an in-progress entry and abandons missing entries safely', async () => {
    const store = new InMemoryIdempotencyStore();
    await expect(
      store.complete('scope', 'missing_123', 201, { data: true }, {}),
    ).rejects.toThrow('Cannot complete an idempotency key that is not in progress.');
    await expect(store.abandon('scope', 'missing_123')).resolves.toBeUndefined();
  });

  it('canonicalizes arrays, scalar values, and undefined object properties', () => {
    expect(hashCanonicalBody([1, { z: undefined, a: null }])).toBe(
      hashCanonicalBody([1, { a: null }]),
    );
    expect(hashCanonicalBody(undefined)).toBe(hashCanonicalBody(null));
    expect(hashCanonicalBody({ a: 1, a2: 2 })).not.toBe(hashCanonicalBody({ a: 1, a2: 3 }));
  });
});
