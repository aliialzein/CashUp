import { z } from 'zod';
import type { Actor } from '../services';
import { idempotencyHeaderSchema, hashCanonicalBody } from './idempotency';
import { IdempotencyInProgressError, IdempotencyKeyMismatchError } from './errors';
import { mapHttpError } from './errorMapper';
import { jsonResponse, makeSuccessEnvelope } from './envelope';
import { getRequestId } from './requestId';
import { readJsonBody } from './readBody';
import type { HttpDependencies } from './types';

type Schema = z.ZodType;
type Output<S extends Schema | undefined> = S extends Schema ? z.output<S> : undefined;

const requiredEntityIdempotencyHeaderSchema = z.object({
  header: z.object({ 'Idempotency-Key': z.uuid() }),
});
const idempotencyHeaderInputSchema = z.object({
  header: z.object({ 'Idempotency-Key': idempotencyHeaderSchema }),
});

export interface RouteContext {
  readonly params?: Promise<Record<string, string>> | Record<string, string>;
}

export interface RouteResult<T> {
  readonly data: T;
  readonly page?: { readonly nextCursor: string | null };
  readonly status?: number;
  readonly headers?: Record<string, string>;
}

export interface RouteRunInput<
  P extends Schema | undefined,
  Q extends Schema | undefined,
  B extends Schema | undefined,
> {
  readonly actor: Actor;
  readonly params: Output<P>;
  readonly query: Output<Q>;
  readonly body: Output<B>;
  readonly requestId: string;
  readonly idempotencyKey?: string;
}

interface DefineRouteOptions<
  P extends Schema | undefined,
  Q extends Schema | undefined,
  B extends Schema | undefined,
  T,
> {
  readonly deps: HttpDependencies;
  readonly routeTemplate: string;
  readonly params?: P;
  readonly query?: Q;
  readonly body?: B;
  readonly successStatus: number;
  readonly idempotent?: boolean;
  readonly entityIdempotencyKey?: 'required';
  readonly run: (
    input: RouteRunInput<P, Q, B>,
  ) => T | RouteResult<T> | Promise<T | RouteResult<T>>;
}

export function defineRoute<
  P extends Schema | undefined = undefined,
  Q extends Schema | undefined = undefined,
  B extends Schema | undefined = undefined,
  T = unknown,
>(
  options: DefineRouteOptions<P, Q, B, T>,
): (request: Request, context?: RouteContext) => Promise<Response> {
  return async (request, context = {}) => {
    const requestId = getRequestId(request);
    let idempotencyScope: string | undefined;
    let idempotencyKey: string | undefined;
    let idempotencyStarted = false;

    try {
      const session = await options.deps.sessionProvider.getSession(request);
      const rawParams = context.params ? await context.params : {};
      const params = options.params ? options.params.parse(rawParams) : undefined;
      const rawQuery = readQuery(request);
      const query = options.query
        ? options.query.parse(rawQuery)
        : undefined;
      if (!options.query) z.object({}).strict().parse(rawQuery);
      const rawBody = await readJsonBody(request);
      const body = options.body
        ? options.body.parse(rawBody)
        : rawBody === undefined
          ? undefined
          : z.object({}).strict().parse(rawBody);

      const actor = await options.deps.actorResolver.resolve(session.userId, session.businessId);

      if (options.entityIdempotencyKey === 'required') {
        idempotencyKey = requiredEntityIdempotencyHeaderSchema.parse({
          header: { 'Idempotency-Key': request.headers.get('idempotency-key') },
        }).header['Idempotency-Key'];
      }

      if (options.idempotent) {
        const keyHeader = request.headers.get('idempotency-key');
        if (keyHeader !== null) {
          idempotencyKey = idempotencyHeaderInputSchema.parse({
            header: { 'Idempotency-Key': keyHeader },
          }).header['Idempotency-Key'];
          idempotencyScope = [
            session.businessId,
            session.userId,
            request.method.toUpperCase(),
            options.routeTemplate,
          ].join(':');
          const begin = await options.deps.idempotencyStore.begin(
            idempotencyScope,
            idempotencyKey,
            hashCanonicalBody(body),
          );
          if (begin.state === 'mismatch') throw new IdempotencyKeyMismatchError();
          if (begin.state === 'in_progress') throw new IdempotencyInProgressError();
          if (begin.state === 'replay') {
            return jsonResponse(
              begin.body,
              begin.status,
              requestId,
              { ...begin.headers, 'Idempotent-Replayed': 'true' },
            );
          }
          idempotencyStarted = true;
        }
      }

      const returned = await options.run({
        actor,
        params: params as Output<P>,
        query: query as Output<Q>,
        body: body as Output<B>,
        requestId,
        idempotencyKey,
      });
      const result = isRouteResult(returned) ? returned : { data: returned };
      const status = result.status ?? options.successStatus;
      const envelope = makeSuccessEnvelope(result.data, result.page);
      const responseHeaders = result.headers ?? {};

      if (idempotencyStarted && idempotencyScope && idempotencyKey && status >= 200 && status < 300) {
        await options.deps.idempotencyStore.complete(
          idempotencyScope,
          idempotencyKey,
          status,
          envelope,
          responseHeaders,
        );
        idempotencyStarted = false;
      } else if (idempotencyStarted && idempotencyScope && idempotencyKey) {
        await options.deps.idempotencyStore.abandon(idempotencyScope, idempotencyKey);
        idempotencyStarted = false;
      }

      return jsonResponse(envelope, status, requestId, responseHeaders);
    } catch (error) {
      if (idempotencyStarted && idempotencyScope && idempotencyKey) {
        try {
          await options.deps.idempotencyStore.abandon(idempotencyScope, idempotencyKey);
        } catch (abandonError) {
          options.deps.reportInternalError?.({
            requestId,
            errorName: abandonError instanceof Error ? abandonError.name : 'UnknownError',
            errorMessage: 'Idempotency cleanup failed.',
          });
          return mapHttpError(abandonError, requestId, options.deps.reportInternalError);
        }
      }
      return mapHttpError(error, requestId, options.deps.reportInternalError);
    }
  };
}

function isRouteResult<T>(value: T | RouteResult<T>): value is RouteResult<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    !Array.isArray(value)
  );
}

function readQuery(request: Request): Record<string, string | string[]> {
  const query: Record<string, string | string[]> = {};
  const searchParams = new URL(request.url).searchParams;
  const keys = new Set(searchParams.keys());
  for (const key of keys) {
    const values = searchParams.getAll(key);
    query[key] = values.length === 1 ? values[0] : values;
  }
  return query;
}
