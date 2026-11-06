import { createSaleRoutes } from '@/http/routes/sales';
import { getHttpDeps } from '@/server/composition';
import { runDynamicRoute } from '@/server/dynamic-route';

export function POST(
  request: Request,
  context: { params: Promise<{ id: string; saleId: string }> },
) {
  return runDynamicRoute(() =>
    createSaleRoutes(getHttpDeps()).cancel(request, context),
  );
}
