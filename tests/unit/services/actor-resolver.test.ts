import { ActorResolver } from '../../../src/services/actor-resolver';
import { ForbiddenError } from '../../../src/services/errors';
import type { RepositoryProvider } from '../../../src/services/ports';

describe('ActorResolver', () => {
  it('queries the active membership for each resolution', async () => {
    let queries = 0;
    const provider: RepositoryProvider = {
      repos: () => ({
        memberships: {
          findActiveByUser: async (userId) => {
            queries += 1;
            return {
              id: 'membership-id',
              userId,
              businessId: 'business-id',
              role: 'STAFF',
              status: 'ACTIVE',
              joinedAt: new Date(),
              deactivatedAt: null,
            };
          },
        },
      }),
    };
    const resolver = new ActorResolver(provider);
    const first = await resolver.resolve('user-id', 'business-id');
    const second = await resolver.resolve('user-id', 'business-id');
    expect(queries).toBe(2);
    expect(first).toMatchObject({
      userId: 'user-id',
      membershipId: 'membership-id',
      businessId: 'business-id',
      role: 'STAFF',
    });
    expect(first).not.toBe(second);
  });

  it('forbids users without an active membership', async () => {
    const provider: RepositoryProvider = {
      repos: () => ({
        memberships: { findActiveByUser: async () => null },
      }),
    };
    await expect(
      new ActorResolver(provider).resolve('user-id', 'business-id'),
    ).rejects.toMatchObject({ code: 'ACTOR_NOT_ACTIVE' });
  });

  it('rejects a repository result that is inactive or outside the requested business', async () => {
    const inactive: RepositoryProvider = {
      repos: () => ({
        memberships: {
          findActiveByUser: async () => ({
            id: 'membership-id',
            userId: 'user-id',
            businessId: 'business-id',
            role: 'STAFF',
            status: 'INACTIVE',
            joinedAt: new Date(),
            deactivatedAt: new Date(),
          }),
        },
      }),
    };
    await expect(new ActorResolver(inactive).resolve('user-id', 'business-id')).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });
});
