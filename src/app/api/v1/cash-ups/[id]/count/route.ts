import { createCountRoutes } from '@/http/routes/counts';
import { getHttpDeps } from '@/server/composition';

export function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  return createCountRoutes(getHttpDeps()).replace(request, context);
}
