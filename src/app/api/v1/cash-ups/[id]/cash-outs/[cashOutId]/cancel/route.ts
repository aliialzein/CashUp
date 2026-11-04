import { createCashOutRoutes } from '@/http/routes/cashOuts';
import { getHttpDeps } from '@/server/composition';

export function POST(
  request: Request,
  context: { params: Promise<{ id: string; cashOutId: string }> },
) {
  return createCashOutRoutes(getHttpDeps()).cancel(request, context);
}
