import { UnauthenticatedError } from './errors';
import type { SessionProvider } from './session';

export interface DevSessionEnvironment {
  readonly nodeEnv: string | undefined;
  readonly enabled: string | undefined;
}

/**
 * STUB: replace with the real authentication-backed provider in task 4D.
 * This provider is intentionally disabled unless explicitly enabled outside production.
 */
export class DevHeaderSessionProvider implements SessionProvider {
  constructor(
    private readonly environment: DevSessionEnvironment = {
      nodeEnv: process.env.NODE_ENV,
      enabled: process.env.CASHUP_DEV_AUTH,
    },
  ) {}

  async getSession(request: Request): Promise<{ userId: string; businessId: string }> {
    if (this.environment.nodeEnv === 'production' || this.environment.enabled !== '1') {
      throw new UnauthenticatedError();
    }

    const userId = request.headers.get('x-dev-user-id');
    const businessId = request.headers.get('x-dev-business-id');
    if (!userId || !businessId) throw new UnauthenticatedError();
    return { userId, businessId };
  }
}
