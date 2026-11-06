import { createReviewRoutes } from '@/http/routes/review';
import { getHttpDeps } from '@/server/composition';
import { runDynamicRoute } from '@/server/dynamic-route';

export function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return runDynamicRoute(() =>
    createReviewRoutes(getHttpDeps()).approve(request, context),
  );
}
