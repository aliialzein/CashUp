import { createCashUpRoutes } from '@/http/routes/cashUps';
import { getHttpDeps } from '@/server/composition';

export function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return createCashUpRoutes(getHttpDeps()).getOwn(request, context);
}
