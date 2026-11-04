import type { TenantScope } from '../persistence';
import { ACTOR_BRAND, type Actor } from './actor';
import { ForbiddenError } from './errors';
import type { RepositoryProvider } from './ports';

export class ActorResolver {
  constructor(private readonly repositories: RepositoryProvider) {}

  async resolve(userId: string, businessId: string): Promise<Actor> {
    const scope: TenantScope = { businessId };
    const membership = await this.repositories.repos(scope).memberships.findActiveByUser(userId);
    if (!membership || !membership.isActive || membership.businessId !== businessId) {
      throw new ForbiddenError('ACTOR_NOT_ACTIVE');
    }

    return {
      userId: membership.userId,
      membershipId: membership.id,
      businessId: membership.businessId,
      role: membership.role,
      [ACTOR_BRAND]: true,
    };
  }
}
