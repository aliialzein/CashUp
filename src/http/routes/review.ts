import { z } from 'zod';
import { cashUpHistoryQuerySchema, returnCashUpSchema, uuid } from '../../validation';
import { defineRoute } from '../defineRoute';
import type { HttpDependencies } from '../types';

const cashUpIdParams = z.object({ id: uuid }).strict();

// Next.js static segments such as "open" take precedence over the dynamic "{id}" segment.
export function createReviewRoutes(deps: HttpDependencies) {
  return {
    open: defineRoute({
      deps,
      routeTemplate: '/api/v1/review/cash-ups/open',
      successStatus: 200,
      run: ({ actor }) => deps.queries.listOpenSummaries(actor),
    }),

    submitted: defineRoute({
      deps,
      routeTemplate: '/api/v1/review/cash-ups/submitted',
      successStatus: 200,
      run: ({ actor }) => deps.queries.listSubmitted(actor),
    }),

    reviewed: defineRoute({
      deps,
      routeTemplate: '/api/v1/review/cash-ups/reviewed',
      query: cashUpHistoryQuerySchema,
      successStatus: 200,
      run: async ({ actor, query }) => {
        const rows = await deps.queries.listReviewed(actor, { ...query, take: query.take + 1 });
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

    getReviewDetail: defineRoute({
      deps,
      routeTemplate: '/api/v1/review/cash-ups/{id}',
      params: cashUpIdParams,
      successStatus: 200,
      run: ({ actor, params }) => deps.queries.getReviewDetail(actor, params.id),
    }),

    approve: defineRoute({
      deps,
      routeTemplate: '/api/v1/review/cash-ups/{id}/approve',
      params: cashUpIdParams,
      successStatus: 200,
      run: ({ actor, params }) => deps.lifecycle.approve(actor, params.id),
    }),

    returnToOpen: defineRoute({
      deps,
      routeTemplate: '/api/v1/review/cash-ups/{id}/return',
      params: cashUpIdParams,
      body: returnCashUpSchema,
      successStatus: 200,
      run: ({ actor, params, body }) =>
        deps.lifecycle.returnToOpen(actor, params.id, body.reason),
    }),
  };
}
