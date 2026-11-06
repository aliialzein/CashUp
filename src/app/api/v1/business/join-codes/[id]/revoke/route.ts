import { createBusinessSetupRoutes } from '@/http/routes/businessSetup';
import { getHttpDeps } from '@/server/composition';
import { runDynamicRoute } from '@/server/dynamic-route';
import type { RouteContext } from '@/http';

export function POST(request: Request, context: RouteContext) {
  return runDynamicRoute(() =>
    createBusinessSetupRoutes(getHttpDeps()).revokeJoinCode(request, context),
  );
}
