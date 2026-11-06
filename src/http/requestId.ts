import { randomUUID } from 'node:crypto';
import { uuid } from '../validation';

export function getRequestId(request: Request): string {
  const provided = request.headers.get('x-request-id');
  return provided && uuid.safeParse(provided).success ? provided : randomUUID();
}
