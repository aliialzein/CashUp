import { createBusinessSetupRoutes } from '@/http/routes/businessSetup';
import { getHttpDeps } from '@/server/composition';
import { runDynamicRoute } from '@/server/dynamic-route';

export function GET(request: Request) {
  return runDynamicRoute(() =>
    createBusinessSetupRoutes(getHttpDeps()).listJoinCodes(request),
  );
}

export function POST(request: Request) {
  return runDynamicRoute(() =>
    createBusinessSetupRoutes(getHttpDeps()).createJoinCode(request),
  );
}
