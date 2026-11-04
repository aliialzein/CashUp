import { createReviewRoutes } from '@/http/routes/review';
import { getHttpDeps } from '@/server/composition';

export function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return createReviewRoutes(getHttpDeps()).getReviewDetail(request, context);
}
