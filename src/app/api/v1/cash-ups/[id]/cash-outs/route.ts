import { createCashOutRoutes } from '@/http/routes/cashOuts';
import { getHttpDeps } from '@/server/composition';

export function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return createCashOutRoutes(getHttpDeps()).create(request, context);
}
