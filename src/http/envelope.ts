export interface SuccessEnvelope<T> {
  readonly data: T;
  readonly page?: { readonly nextCursor: string | null };
}

export interface ErrorEnvelope {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: readonly { readonly path: string[]; readonly code: string }[];
    readonly requestId: string;
  };
}

export function makeSuccessEnvelope<T>(
  data: T,
  page?: { readonly nextCursor: string | null },
): SuccessEnvelope<T> {
  return page ? { data, page } : { data };
}

export function jsonResponse(
  body: unknown,
  status: number,
  requestId: string,
  headers: Record<string, string> = {},
): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set('Content-Type', 'application/json; charset=utf-8');
  responseHeaders.set('Cache-Control', 'no-store');
  responseHeaders.set('X-Request-Id', requestId);
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}
