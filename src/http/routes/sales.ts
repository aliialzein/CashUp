import { z } from 'zod';
import {
  cancelSaleSchema,
  confirmDeliverySchema,
  createSaleSchema,
  editSaleSchema,
  uuid,
} from '../../validation';
import { defineRoute } from '../defineRoute';
import type { HttpDependencies } from '../types';

const cashUpParams = z.object({ id: uuid }).strict();
const saleParams = z.object({ id: uuid, saleId: uuid }).strict();

export function createSaleRoutes(deps: HttpDependencies) {
  return {
    create: defineRoute({
      deps,
      routeTemplate: '/api/v1/cash-ups/{id}/sales',
      params: cashUpParams,
      body: createSaleSchema,
      successStatus: 201,
      entityIdempotencyKey: 'required',
      run: async ({ actor, params, body, idempotencyKey }) => {
        if (!idempotencyKey) throw new Error('Entity idempotency key was not validated.');
        const result = await deps.sales.create(actor, params.id, body, idempotencyKey);
        const { replayed, ...data } = result;
        return {
          data,
          status: replayed ? 200 : 201,
          headers: {
            Location: `/api/v1/cash-ups/${params.id}/sales/${result.saleId}`,
            ...(replayed ? { 'Idempotent-Replayed': 'true' } : {}),
          },
        };
      },
    }),

    edit: defineRoute({
      deps,
      routeTemplate: '/api/v1/cash-ups/{id}/sales/{saleId}',
      params: saleParams,
      body: editSaleSchema,
      successStatus: 200,
      run: ({ actor, params, body }) =>
        deps.sales.edit(actor, params.id, params.saleId, body),
    }),

    confirmDelivery: defineRoute({
      deps,
      routeTemplate: '/api/v1/cash-ups/{id}/sales/{saleId}/confirm-delivery',
      params: saleParams,
      body: confirmDeliverySchema,
      successStatus: 200,
      run: ({ actor, params, body }) =>
        deps.sales.confirmDelivery(actor, params.id, params.saleId, body),
    }),

    cancel: defineRoute({
      deps,
      routeTemplate: '/api/v1/cash-ups/{id}/sales/{saleId}/cancel',
      params: saleParams,
      body: cancelSaleSchema,
      successStatus: 200,
      run: ({ actor, params, body }) =>
        deps.sales.cancel(actor, params.id, params.saleId, body.reason),
    }),
  };
}
