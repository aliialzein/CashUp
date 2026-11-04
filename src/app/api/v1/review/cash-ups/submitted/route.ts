import { createReviewRoutes } from '@/http/routes/review';
import { getHttpDeps } from '@/server/composition';

export function GET(request: Request) {
  return createReviewRoutes(getHttpDeps()).submitted(request);
}
