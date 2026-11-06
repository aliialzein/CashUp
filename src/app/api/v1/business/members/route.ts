import { createBusinessSetupRoutes } from '@/http/routes/businessSetup';
import { getHttpDeps } from '@/server/composition';
import { runDynamicRoute } from '@/server/dynamic-route';

export function GET(request: Request) {
  return runDynamicRoute(() =>
    createBusinessSetupRoutes(getHttpDeps()).listMembers(request),
  );
}
