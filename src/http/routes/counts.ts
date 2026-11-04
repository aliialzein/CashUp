import { z } from 'zod';
import { saveCountLinesSchema, uuid } from '../../validation';
import { defineRoute } from '../defineRoute';
import type { HttpDependencies } from '../types';

const cashUpParams = z.object({ id: uuid }).strict();

export function createCountRoutes(deps: HttpDependencies) {
  return {
    replace: defineRoute({
      deps,
      routeTemplate: '/api/v1/cash-ups/{id}/count',
      params: cashUpParams,
      body: saveCountLinesSchema,
      successStatus: 200,
      run: ({ actor, params, body }) => deps.counts.replace(actor, params.id, body),
    }),
  };
}
