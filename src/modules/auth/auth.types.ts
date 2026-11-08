import type { MembershipRole } from '../../generated/prisma/enums';

export interface CurrentUser {
  readonly id: string;
  readonly email: string;
  readonly fullName: string;
  readonly membership: { businessId: string; role: MembershipRole; status: 'ACTIVE' | 'INACTIVE' } | null;
}
export class AuthFailure extends Error {
  constructor(public readonly code: 'INVALID_CREDENTIALS' | 'SIGNUP_UNAVAILABLE' | 'TOO_MANY_ATTEMPTS' | 'AUTH_UNAVAILABLE') {
    super(code);
  }
}
export type AuthActionResult = { ok: true; destination: string } | {
  ok: false; message: string; code?: AuthFailure['code']; fields?: Partial<Record<'email' | 'password' | 'fullName', string>>;
};

export interface CurrentMember {
  readonly userId: string;
  readonly membershipId: string;
  readonly businessId: string;
  readonly role: MembershipRole;
}

export interface CurrentIdentity {
  readonly userId: string;
  readonly businessId?: string;
}

export type ReviewDecision = {
  allowed: true;
  selfApproved: boolean;
} | {
  allowed: false;
  reason: 'WRONG_REVIEWER_ROLE' | 'SELF_REVIEW_FORBIDDEN';
};

export interface ReviewParticipants {
  readonly reviewer: MembershipRole;
  readonly reviewerMembershipId: string;
  readonly cashUpOwner: MembershipRole;
  readonly ownerMembershipId: string;
  readonly isSolo: boolean;
}
