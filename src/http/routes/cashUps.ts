import { z } from 'zod';
import { openCashUpSchema, pageQuery, uuid } from '../../validation';
import { defineRoute } from '../defineRoute';
import type { HttpDependencies } from '../types';

const cashUpIdParams = z.object({ id: uuid }).strict();

export function createCashUpRoutes(deps: HttpDependencies) {
  return {
    open: defineRoute({
      deps,
      routeTemplate: '/api/v1/cash-ups',
      body: openCashUpSchema,
      successStatus: 201,
      idempotent: true,
      run: async ({ actor, body }) => {
        const cashUp = await deps.lifecycle.open(actor, body);
        return {
          data: cashUp,
          headers: { Location: `/api/v1/cash-ups/${cashUp.id}` },
        };
      },
    }),

    listOwn: defineRoute({
      deps,
      routeTemplate: '/api/v1/cash-ups',
      query: pageQuery,
      successStatus: 200,
      run: async ({ actor, query }) => {
        const rows = await deps.queries.listOwn(actor, { ...query, take: query.take + 1 });
        const hasMore = rows.length > query.take;
        const cashUps = rows.slice(0, query.take);
        return {
          data: cashUps,
          page: {
            nextCursor: hasMore ? cashUps.at(-1)?.id ?? null : null,
          },
        };
      },
    }),

    getOwn: defineRoute({
      deps,
      routeTemplate: '/api/v1/cash-ups/{id}',
      params: cashUpIdParams,
      successStatus: 200,
      run: ({ actor, params }) => deps.queries.getOwn(actor, params.id),
    }),

    submit: defineRoute({
      deps,
      routeTemplate: '/api/v1/cash-ups/{id}/submit',
      params: cashUpIdParams,
      successStatus: 200,
      run: ({ actor, params }) => deps.lifecycle.submit(actor, params.id),
    }),
  };
}
