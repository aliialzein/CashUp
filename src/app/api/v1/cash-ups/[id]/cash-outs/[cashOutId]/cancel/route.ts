import { createCashOutRoutes } from '@/http/routes/cashOuts';
import { getHttpDeps } from '@/server/composition';
import { runDynamicRoute } from '@/server/dynamic-route';

export function POST(
  request: Request,
  context: { params: Promise<{ id: string; cashOutId: string }> },
) {
  return runDynamicRoute(() =>
    createCashOutRoutes(getHttpDeps()).cancel(request, context),
  );
}
