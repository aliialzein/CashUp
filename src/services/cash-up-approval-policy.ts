import type { MembershipRole } from '../persistence';

export type ReviewDecision =
  | { allowed: true; selfApproved: boolean }
  | { allowed: false; reason: 'WRONG_REVIEWER_ROLE' | 'SELF_REVIEW_FORBIDDEN' };

type RolePolicy = Readonly<Record<'regular' | 'solo', MembershipRole | null>>;

const REVIEWER_ROLE_BY_OWNER: Readonly<Record<MembershipRole, RolePolicy>> = {
  STAFF: { regular: 'MANAGER', solo: 'MANAGER' },
  MANAGER: { regular: 'OWNER', solo: 'OWNER' },
  OWNER: { regular: null, solo: 'OWNER' },
};

export interface ReviewActors {
  readonly reviewer: MembershipRole;
  readonly reviewerMembershipId: string;
  readonly cashUpOwner: MembershipRole;
  readonly ownerMembershipId: string;
  readonly isSolo: boolean;
}

export function selectReviewerRole(ownerRole: MembershipRole, isSolo: boolean): MembershipRole | null {
  return REVIEWER_ROLE_BY_OWNER[ownerRole][isSolo ? 'solo' : 'regular'];
}

export function canReview(input: ReviewActors): ReviewDecision {
  const expectedRole = selectReviewerRole(input.cashUpOwner, input.isSolo);
  if (expectedRole === null || input.reviewer !== expectedRole) {
    return { allowed: false, reason: 'WRONG_REVIEWER_ROLE' };
  }

  const isSelf = input.reviewerMembershipId === input.ownerMembershipId;
  if (!isSelf) return { allowed: true, selfApproved: false };
  if (input.isSolo && input.cashUpOwner === 'OWNER' && input.reviewer === 'OWNER') {
    return { allowed: true, selfApproved: true };
  }
  return { allowed: false, reason: 'SELF_REVIEW_FORBIDDEN' };
}
