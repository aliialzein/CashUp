import { z } from 'zod';
import { cancelCashOutSchema, createCashOutSchema, uuid } from '../../validation';
import { defineRoute } from '../defineRoute';
import type { HttpDependencies } from '../types';

const cashUpParams = z.object({ id: uuid }).strict();
const cashOutParams = z.object({ id: uuid, cashOutId: uuid }).strict();

export function createCashOutRoutes(deps: HttpDependencies) {
  return {
    create: defineRoute({
      deps,
      routeTemplate: '/api/v1/cash-ups/{id}/cash-outs',
      params: cashUpParams,
      body: createCashOutSchema,
      successStatus: 201,
      entityIdempotencyKey: 'required',
      run: async ({ actor, params, body, idempotencyKey }) => {
        if (!idempotencyKey) throw new Error('Entity idempotency key was not validated.');
        const result = await deps.cashOuts.create(
          actor,
          params.id,
          body,
          idempotencyKey,
        );
        const { replayed, ...data } = result;
        return {
          data,
          status: replayed ? 200 : 201,
          headers: {
            Location: `/api/v1/cash-ups/${params.id}/cash-outs/${result.cashOut.id}`,
            ...(replayed ? { 'Idempotent-Replayed': 'true' } : {}),
          },
        };
      },
    }),

    cancel: defineRoute({
      deps,
      routeTemplate: '/api/v1/cash-ups/{id}/cash-outs/{cashOutId}/cancel',
      params: cashOutParams,
      body: cancelCashOutSchema,
      successStatus: 200,
      run: ({ actor, params, body }) =>
        deps.cashOuts.cancel(actor, params.id, params.cashOutId, body.reason),
    }),
  };
}
