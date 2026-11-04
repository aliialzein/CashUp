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
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_MATRIX: Record<MembershipRole, ReadonlySet<Permission>> = {
  STAFF: new Set([
    'cashUp.open',
    'cashUp.submit',
    'cashUp.readOwn',
    'cashUp.listOwn',
    'cashUp.mutateOwn',
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
  ]),
  OWNER: new Set([
    'cashUp.review',
    'cashUp.listOpenSummaries',
    'cashUp.readReviewed',
    'cashUp.listSubmitted',
    'audit.read',
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
