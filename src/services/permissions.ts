import type { MembershipRole } from '../persistence';
import type { Actor } from './actor';
import { ForbiddenError } from './errors';

export const PERMISSIONS = [
  'cashUp.open',
  'cashUp.submit',
  'cashUp.review',
  'cashUp.listOpenSummaries',
  'cashUp.readReviewed',
  'cashUp.readOwn',
  'cashUp.listOwn',
  'cashUp.listSubmitted',
  'audit.read',
  'cashUp.mutateOwn',
  'business.read',
  'members.list',
  'members.deactivate',
  'manager.replace',
  'business.changeSolo',
  'joinCodes.create',
  'joinCodes.list',
  'joinCodes.revoke',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const BUSINESS_READ_PERMISSION: readonly Permission[] = ['business.read'];

const MANAGER_SETUP_PERMISSIONS: readonly Permission[] = [
  ...BUSINESS_READ_PERMISSION,
  'members.list',
  'members.deactivate',
  'joinCodes.create',
  'joinCodes.list',
  'joinCodes.revoke',
];

const OWNER_SETUP_PERMISSIONS: readonly Permission[] = [
  ...MANAGER_SETUP_PERMISSIONS,
  'manager.replace',
  'business.changeSolo',
];

export const PERMISSION_MATRIX: Record<MembershipRole, ReadonlySet<Permission>> = {
  STAFF: new Set([
    'cashUp.open',
    'cashUp.submit',
    'cashUp.readOwn',
    'cashUp.listOwn',
    'cashUp.mutateOwn',
    ...BUSINESS_READ_PERMISSION,
  ]),
  MANAGER: new Set([
    'cashUp.open',
    'cashUp.submit',
    'cashUp.review',
    'cashUp.listOpenSummaries',
    'cashUp.readReviewed',
    'cashUp.readOwn',
    'cashUp.listOwn',
    'cashUp.listSubmitted',
    'audit.read',
    'cashUp.mutateOwn',
    ...MANAGER_SETUP_PERMISSIONS,
  ]),
  OWNER: new Set([
    'cashUp.review',
    'cashUp.listOpenSummaries',
    'cashUp.readReviewed',
    'cashUp.listSubmitted',
    'audit.read',
    ...OWNER_SETUP_PERMISSIONS,
  ]),
};

const SOLO_OWNER_PERMISSIONS: ReadonlySet<Permission> = new Set([
  ...PERMISSION_MATRIX.OWNER,
  ...PERMISSION_MATRIX.STAFF,
  ...PERMISSION_MATRIX.MANAGER,
]);

export function permissionsFor(
  role: MembershipRole,
  isSolo: boolean,
): ReadonlySet<Permission> {
  return role === 'OWNER' && isSolo ? SOLO_OWNER_PERMISSIONS : PERMISSION_MATRIX[role];
}

export function assertCan(actor: Actor, permission: Permission, isSolo: boolean): void {
  if (!permissionsFor(actor.role, isSolo).has(permission)) throw new ForbiddenError();
}

export class PermissionMatrix {
  permissionsFor(role: MembershipRole, isSolo: boolean): ReadonlySet<Permission> {
    return permissionsFor(role, isSolo);
  }

  assertCan(actor: Actor, permission: Permission, isSolo: boolean): void {
    assertCan(actor, permission, isSolo);
  }
}
