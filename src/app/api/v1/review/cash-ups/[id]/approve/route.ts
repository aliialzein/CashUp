import { createReviewRoutes } from '@/http/routes/review';
import { getHttpDeps } from '@/server/composition';

export function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return createReviewRoutes(getHttpDeps()).approve(request, context);
}
