import { MembershipRole } from '../../../src/persistence';
import { permissionsFor, type Permission } from '../../../src/services/permissions';

const expected: Record<`${MembershipRole}:${boolean}`, Permission[]> = {
  'STAFF:false': ['cashUp.open', 'cashUp.submit', 'cashUp.readOwn', 'cashUp.listOwn'],
  'STAFF:true': ['cashUp.open', 'cashUp.submit', 'cashUp.readOwn', 'cashUp.listOwn'],
  'MANAGER:false': [
    'cashUp.open',
    'cashUp.submit',
    'cashUp.review',
    'cashUp.listOpenSummaries',
    'cashUp.readReviewed',
    'cashUp.readOwn',
    'cashUp.listOwn',
    'cashUp.listSubmitted',
    'audit.read',
  ],
  'MANAGER:true': [
    'cashUp.open',
    'cashUp.submit',
    'cashUp.review',
    'cashUp.listOpenSummaries',
    'cashUp.readReviewed',
    'cashUp.readOwn',
    'cashUp.listOwn',
    'cashUp.listSubmitted',
    'audit.read',
  ],
  'OWNER:false': [
    'cashUp.review',
    'cashUp.listOpenSummaries',
    'cashUp.readReviewed',
    'cashUp.listSubmitted',
    'audit.read',
  ],
  'OWNER:true': [
    'cashUp.review',
    'cashUp.listOpenSummaries',
    'cashUp.readReviewed',
    'cashUp.listOwn',
    'cashUp.listSubmitted',
    'audit.read',
    'cashUp.open',
    'cashUp.readOwn',
    'cashUp.submit',
  ],
};

describe('permissionsFor', () => {
  it.each(Object.values(MembershipRole).flatMap((role) => [false, true].map((solo) => [role, solo] as const)))(
    'returns the full permission set for %s / solo=%s',
    (role, solo) => {
      expect([...permissionsFor(role, solo)].sort()).toEqual(
        expected[`${role}:${solo}`].sort(),
      );
    },
  );
});
