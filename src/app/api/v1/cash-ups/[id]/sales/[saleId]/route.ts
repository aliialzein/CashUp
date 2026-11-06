import { createSaleRoutes } from '@/http/routes/sales';
import { getHttpDeps } from '@/server/composition';
import { runDynamicRoute } from '@/server/dynamic-route';

export function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; saleId: string }> },
) {
  return runDynamicRoute(() =>
    createSaleRoutes(getHttpDeps()).edit(request, context),
  );
}
