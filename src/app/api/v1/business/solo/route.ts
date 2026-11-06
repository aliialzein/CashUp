import { createBusinessSetupRoutes } from '@/http/routes/businessSetup';
import { getHttpDeps } from '@/server/composition';
import { runDynamicRoute } from '@/server/dynamic-route';

export function PATCH(request: Request) {
  return runDynamicRoute(() =>
    createBusinessSetupRoutes(getHttpDeps()).setBusinessSolo(request),
  );
}
