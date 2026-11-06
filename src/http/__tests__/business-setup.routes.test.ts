import { ACTOR_BRAND } from '../../services/actor';
import { BusinessRuleError } from '../../services/errors';
import type { Actor } from '../../services/actor';
import type { HttpDependencies } from '../types';
import { createBusinessSetupRoutes } from '../routes/businessSetup';
import { DevHeaderSessionProvider } from '../devSession';
import { UnauthenticatedError } from '../errors';

const userId = 'cfd0db5d-cd96-4f5c-bb34-88d08e0748a8';
const businessId = '02d32eae-21cb-497f-86e4-8a2df9e469f8';
const memberId = '4c9c5415-0cc5-427d-8a61-64829c6de50c';
const joinCodeId = 'e2461a3b-6449-4dfb-94b6-aed839bac5aa';
const actor: Actor = {
  userId,
  membershipId: memberId,
  businessId,
  role: 'OWNER',
  [ACTOR_BRAND]: true,
};

function dependencies(
  overrides: Partial<HttpDependencies['businessSetup']> = {},
): HttpDependencies {
  const unexpected = async (): Promise<never> => {
    throw new Error('Unexpected non-business setup service call.');
  };
  return {
    sessionProvider: { getSession: async () => ({ userId, businessId }) },
    actorResolver: { resolve: async () => actor },
    lifecycle: {
      open: unexpected,
      submit: unexpected,
      approve: unexpected,
      returnToOpen: unexpected,
    },
    sales: {
      create: unexpected,
      edit: unexpected,
      confirmDelivery: unexpected,
      cancel: unexpected,
    },
    cashOuts: { create: unexpected, cancel: unexpected },
    counts: { replace: unexpected },
    queries: {
      getOwn: unexpected,
      listOwn: unexpected,
      listOpenSummaries: unexpected,
      listSubmitted: unexpected,
      listReviewed: unexpected,
      getReviewDetail: unexpected,
    },
    businessSetup: {
      createBusiness: jest.fn(async (_userId, input) => ({
        id: businessId,
        name: input.name,
        isSolo: input.isSolo,
        role: 'OWNER' as const,
      })),
      getBusiness: async () => ({
        id: businessId,
        name: 'CashUp',
        isSolo: false,
        role: 'OWNER',
      }),
      listMembers: async () => [
        {
          id: memberId,
          fullName: 'Owner',
          role: 'OWNER',
          status: 'ACTIVE',
          joinedAt: '2026-11-05T00:00:00.000Z',
          deactivatedAt: null,
        },
      ],
      deactivateMember: async () => ({
        id: memberId,
        fullName: 'Staff',
        role: 'STAFF',
        status: 'INACTIVE',
        joinedAt: '2026-11-05T00:00:00.000Z',
        deactivatedAt: '2026-11-05T01:00:00.000Z',
      }),
      replaceManager: async () => ({
        id: memberId,
        fullName: 'Manager',
        role: 'MANAGER',
        status: 'ACTIVE',
        joinedAt: '2026-11-05T00:00:00.000Z',
        deactivatedAt: null,
      }),
      setBusinessSolo: async (_actor, input) => ({
        id: businessId,
        name: 'CashUp',
        isSolo: input.isSolo,
        role: 'OWNER',
      }),
      createJoinCode: async () => ({
        id: joinCodeId,
        code: '23456789ABCD',
        expiresAt: '2026-11-12T00:00:00.000Z',
        maxUses: 1,
      }),
      listJoinCodes: async () => [
        {
          id: joinCodeId,
          status: 'active',
          expiresAt: '2026-11-12T00:00:00.000Z',
          maxUses: 1,
          usedCount: 0,
          createdAt: '2026-11-05T00:00:00.000Z',
        },
      ],
      revokeJoinCode: async (_actor, id) => ({ id, status: 'revoked' }),
      redeemJoinCode: jest.fn(async () => ({
        role: 'STAFF' as const,
        status: 'ACTIVE' as const,
      })),
      ...overrides,
    },
    idempotencyStore: {
      begin: unexpected,
      complete: unexpected,
      abandon: unexpected,
    },
  };
}

function request(
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {
    'x-dev-user-id': userId,
    'x-dev-business-id': businessId,
  },
) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe('business setup HTTP route contracts', () => {
  it('returns the established data envelope and only returns the plain join code on create', async () => {
    const deps = dependencies();
    const routes = createBusinessSetupRoutes(deps);
    const responses = await Promise.all([
      routes.createBusiness(
        request('POST', '/api/v1/businesses', { name: ' New business ' }, {
          'x-dev-user-id': userId,
        }),
      ),
      routes.getBusiness(request('GET', '/api/v1/business')),
      routes.setBusinessSolo(request('PATCH', '/api/v1/business/solo', { isSolo: true })),
      routes.listMembers(request('GET', '/api/v1/business/members')),
      routes.deactivateMember(
        request('POST', `/api/v1/business/members/${memberId}/deactivate`),
        { params: { memberId } },
      ),
      routes.replaceManager(
        request('PUT', '/api/v1/business/manager', { memberId }),
      ),
      routes.createJoinCode(
        request('POST', '/api/v1/business/join-codes', {}),
      ),
      routes.listJoinCodes(request('GET', '/api/v1/business/join-codes')),
      routes.revokeJoinCode(
        request('POST', `/api/v1/business/join-codes/${joinCodeId}/revoke`),
        { params: { id: joinCodeId } },
      ),
      routes.redeemJoinCode(
        request('POST', '/api/v1/join-codes/redeem', { code: '23456789ABCD' }, {
          'x-dev-user-id': userId,
        }),
      ),
    ]);

    expect(responses.map((response) => response.status)).toEqual([
      201, 200, 200, 200, 200, 200, 201, 200, 200, 200,
    ]);
    expect(await responses[0].json()).toEqual({
      data: { id: businessId, name: 'New business', isSolo: false, role: 'OWNER' },
    });
    const createCodeBody = await responses[6].json();
    expect(createCodeBody).toMatchObject({
      data: { id: joinCodeId, code: '23456789ABCD', maxUses: 1 },
    });
    expect(JSON.stringify(await responses[7].json())).not.toMatch(/codeHash|23456789ABCD/);
    expect(JSON.stringify(await responses[3].json())).not.toMatch(/userId|businessId/);
    expect(deps.businessSetup.createBusiness).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({ name: 'New business', isSolo: false }),
    );
    expect(deps.businessSetup.redeemJoinCode).toHaveBeenCalledWith(userId, '23456789ABCD');
  });

  it('rejects unknown keys without echoing submitted values', async () => {
    const response = await createBusinessSetupRoutes(dependencies()).createBusiness(
      request('POST', '/api/v1/businesses', {
        name: 'private-value',
        password: 'must-not-echo',
      }, { 'x-dev-user-id': userId }),
    );
    const body = await response.text();
    expect(response.status).toBe(400);
    expect(body).toContain('"code":"VALIDATION_ERROR"');
    expect(body).not.toContain('private-value');
    expect(body).not.toContain('must-not-echo');
  });

  it('uses the same generic response for all invalid join-code states', async () => {
    const badStates = [
      'not_found',
      'revoked',
      'expired',
      'max_uses_reached',
      'usage_update_failed',
    ] as const;
    const responses = await Promise.all(
      badStates.map(async () => {
        const response = await createBusinessSetupRoutes(
          dependencies({
            redeemJoinCode: async () => {
              throw new BusinessRuleError('JOIN_CODE_INVALID');
            },
          }),
        ).redeemJoinCode(
          request('POST', '/api/v1/join-codes/redeem', { code: '23456789ABCD' }, {
            'x-dev-user-id': userId,
          }),
        );
        return { status: response.status, body: await response.json() };
      }),
    );
    expect(responses.map(({ status, body }) => [status, body])).toEqual(
      badStates.map(() => [
        422,
        expect.objectContaining({
          error: expect.objectContaining({ code: 'JOIN_CODE_INVALID' }),
        }),
      ]),
    );
  });

  it('allows missing business headers only through the explicit development-session option', async () => {
    const provider = new DevHeaderSessionProvider({
      nodeEnv: 'test',
      enabled: '1',
    });
    const noBusinessRequest = request('POST', '/api/v1/businesses', { name: 'Shop' }, {
      'x-dev-user-id': userId,
    });
    await expect(provider.getSession(noBusinessRequest)).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
    await expect(
      provider.getSession(noBusinessRequest, { allowMissingBusiness: true }),
    ).resolves.toEqual({ userId, businessId: undefined });
    await expect(
      new DevHeaderSessionProvider({ nodeEnv: 'production', enabled: '1' }).getSession(
        noBusinessRequest,
        { allowMissingBusiness: true },
      ),
    ).rejects.toBeInstanceOf(UnauthenticatedError);
  });
});
