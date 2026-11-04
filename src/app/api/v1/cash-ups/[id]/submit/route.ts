import { createCashUpRoutes } from '@/http/routes/cashUps';
import { getHttpDeps } from '@/server/composition';
import { runDynamicRoute } from '@/server/dynamic-route';

export function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return runDynamicRoute(() =>
    createCashUpRoutes(getHttpDeps()).submit(request, context),
  );
}
