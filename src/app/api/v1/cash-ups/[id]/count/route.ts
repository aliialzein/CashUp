import { createCountRoutes } from '@/http/routes/counts';
import { getHttpDeps } from '@/server/composition';
import { runDynamicRoute } from '@/server/dynamic-route';

export function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  return runDynamicRoute(() =>
    createCountRoutes(getHttpDeps()).replace(request, context),
  );
}
