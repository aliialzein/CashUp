import { z } from 'zod';
import {
  createBusinessSchema,
  createJoinCodeSchema,
  redeemJoinCodeSchema,
  replaceManagerSchema,
  setBusinessSoloSchema,
  uuid,
} from '../../validation';
import { defineRoute } from '../defineRoute';
import type { HttpDependencies } from '../types';

const memberParams = z.object({ memberId: uuid }).strict();
const joinCodeParams = z.object({ id: uuid }).strict();

export function createBusinessSetupRoutes(deps: HttpDependencies) {
  return {
    createBusiness: defineRoute({
      deps,
      routeTemplate: '/api/v1/businesses',
      body: createBusinessSchema,
      successStatus: 201,
      allowMissingBusiness: true,
      run: ({ session, body }) => deps.businessSetup.createBusiness(session.userId, body),
    }),

    redeemJoinCode: defineRoute({
      deps,
      routeTemplate: '/api/v1/join-codes/redeem',
      body: redeemJoinCodeSchema,
      successStatus: 200,
      allowMissingBusiness: true,
      run: ({ session, body }) =>
        deps.businessSetup.redeemJoinCode(session.userId, body.code),
    }),

    getBusiness: defineRoute({
      deps,
      routeTemplate: '/api/v1/business',
      successStatus: 200,
      run: ({ actor }) => deps.businessSetup.getBusiness(actor),
    }),

    setBusinessSolo: defineRoute({
      deps,
      routeTemplate: '/api/v1/business/solo',
      body: setBusinessSoloSchema,
      successStatus: 200,
      run: ({ actor, body }) => deps.businessSetup.setBusinessSolo(actor, body),
    }),

    listMembers: defineRoute({
      deps,
      routeTemplate: '/api/v1/business/members',
      successStatus: 200,
      run: ({ actor }) => deps.businessSetup.listMembers(actor),
    }),

    deactivateMember: defineRoute({
      deps,
      routeTemplate: '/api/v1/business/members/{memberId}/deactivate',
      params: memberParams,
      successStatus: 200,
      run: ({ actor, params }) =>
        deps.businessSetup.deactivateMember(actor, params.memberId),
    }),

    replaceManager: defineRoute({
      deps,
      routeTemplate: '/api/v1/business/manager',
      body: replaceManagerSchema,
      successStatus: 200,
      run: ({ actor, body }) =>
        deps.businessSetup.replaceManager(actor, body.memberId),
    }),

    createJoinCode: defineRoute({
      deps,
      routeTemplate: '/api/v1/business/join-codes',
      body: createJoinCodeSchema,
      successStatus: 201,
      run: ({ actor, body }) => deps.businessSetup.createJoinCode(actor, body),
    }),

    listJoinCodes: defineRoute({
      deps,
      routeTemplate: '/api/v1/business/join-codes',
      successStatus: 200,
      run: ({ actor }) => deps.businessSetup.listJoinCodes(actor),
    }),

    revokeJoinCode: defineRoute({
      deps,
      routeTemplate: '/api/v1/business/join-codes/{id}/revoke',
      params: joinCodeParams,
      successStatus: 200,
      run: ({ actor, params }) =>
        deps.businessSetup.revokeJoinCode(actor, params.id),
    }),
  };
}
