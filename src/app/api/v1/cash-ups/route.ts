import { createCashUpRoutes } from '@/http/routes/cashUps';
import { getHttpDeps } from '@/server/composition';

export function GET(request: Request) {
  return createCashUpRoutes(getHttpDeps()).listOwn(request);
}

export function POST(request: Request) {
  return createCashUpRoutes(getHttpDeps()).open(request);
}
