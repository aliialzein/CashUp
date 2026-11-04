import { createReviewRoutes } from '@/http/routes/review';
import { getHttpDeps } from '@/server/composition';
import { runDynamicRoute } from '@/server/dynamic-route';

export function GET(request: Request) {
  return runDynamicRoute(() => createReviewRoutes(getHttpDeps()).open(request));
}
