import { createSaleRoutes } from '@/http/routes/sales';
import { getHttpDeps } from '@/server/composition';

export function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return createSaleRoutes(getHttpDeps()).create(request, context);
}
