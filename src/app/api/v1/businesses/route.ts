import { createBusinessSetupRoutes } from '@/http/routes/businessSetup';
import { getHttpDeps } from '@/server/composition';
import { runDynamicRoute } from '@/server/dynamic-route';

export function POST(request: Request) {
  return runDynamicRoute(() =>
    createBusinessSetupRoutes(getHttpDeps()).createBusiness(request),
  );
}
