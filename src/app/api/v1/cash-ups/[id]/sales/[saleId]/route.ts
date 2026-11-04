import { createSaleRoutes } from '@/http/routes/sales';
import { getHttpDeps } from '@/server/composition';

export function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; saleId: string }> },
) {
  return createSaleRoutes(getHttpDeps()).edit(request, context);
}
