import { createBusinessSetupRoutes } from '@/http/routes/businessSetup';
import { getHttpDeps } from '@/server/composition';
import { runDynamicRoute } from '@/server/dynamic-route';

export function PUT(request: Request) {
  return runDynamicRoute(() =>
    createBusinessSetupRoutes(getHttpDeps()).replaceManager(request),
  );
}
