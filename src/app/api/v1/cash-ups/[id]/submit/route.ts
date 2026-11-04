import { createCashUpRoutes } from '@/http/routes/cashUps';
import { getHttpDeps } from '@/server/composition';

export function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return createCashUpRoutes(getHttpDeps()).submit(request, context);
}
