import { createCashUpRoutes } from '@/http/routes/cashUps';
import { getHttpDeps } from '@/server/composition';
import { runDynamicRoute } from '@/server/dynamic-route';

export function GET(request: Request) {
  return runDynamicRoute(() => createCashUpRoutes(getHttpDeps()).listOwn(request));
}

export function POST(request: Request) {
  return runDynamicRoute(() => createCashUpRoutes(getHttpDeps()).open(request));
}
