import { MembershipRole } from '../../../src/persistence';
import { canReview, selectReviewerRole } from '../../../src/services/cash-up-approval-policy';

describe('cash-up approval policy', () => {
  const roles = Object.values(MembershipRole);

  it.each(roles.flatMap((reviewer) =>
    roles.flatMap((cashUpOwner) =>
      [false, true].map((isSolo) => [reviewer, cashUpOwner, isSolo] as const),
    ),
  ))('applies the reviewer-role table for %s reviewing %s / solo=%s', (
    reviewer,
    cashUpOwner,
    isSolo,
  ) => {
    const expectedRole = selectReviewerRole(cashUpOwner, isSolo);
    const decision = canReview({
      reviewer,
      reviewerMembershipId: 'reviewer-id',
      cashUpOwner,
      ownerMembershipId: 'owner-id',
      isSolo,
    });
    if (expectedRole === reviewer) {
      expect(decision).toEqual({ allowed: true, selfApproved: false });
    } else {
      expect(decision).toEqual({ allowed: false, reason: 'WRONG_REVIEWER_ROLE' });
    }
  });

  it('allows only solo Owner self-approval', () => {
    expect(
      canReview({
        reviewer: 'OWNER',
        reviewerMembershipId: 'owner-id',
        cashUpOwner: 'OWNER',
        ownerMembershipId: 'owner-id',
        isSolo: true,
      }),
    ).toEqual({ allowed: true, selfApproved: true });
    expect(
      canReview({
        reviewer: 'MANAGER',
        reviewerMembershipId: 'same-id',
        cashUpOwner: 'STAFF',
        ownerMembershipId: 'same-id',
        isSolo: false,
      }),
    ).toEqual({ allowed: false, reason: 'SELF_REVIEW_FORBIDDEN' });
  });
});
