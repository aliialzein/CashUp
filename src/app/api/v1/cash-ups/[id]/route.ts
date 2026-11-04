import { createCashUpRoutes } from '@/http/routes/cashUps';
import { getHttpDeps } from '@/server/composition';
import { runDynamicRoute } from '@/server/dynamic-route';

export function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return runDynamicRoute(() =>
    createCashUpRoutes(getHttpDeps()).getOwn(request, context),
  );
}
