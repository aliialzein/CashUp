import { MembershipRole } from '../../../src/persistence';
import { CashUpApprovalPolicy } from '../../../src/services/cash-up-approval-policy';

describe('CashUpApprovalPolicy', () => {
  const policy = new CashUpApprovalPolicy();
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
    const expectedRole = policy.selectReviewerRole(cashUpOwner, isSolo);
    const decision = policy.canReview({
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
      policy.canReview({
        reviewer: 'OWNER',
        reviewerMembershipId: 'owner-id',
        cashUpOwner: 'OWNER',
        ownerMembershipId: 'owner-id',
        isSolo: true,
      }),
    ).toEqual({ allowed: true, selfApproved: true });
    expect(
      policy.canReview({
        reviewer: 'MANAGER',
        reviewerMembershipId: 'same-id',
        cashUpOwner: 'STAFF',
        ownerMembershipId: 'same-id',
        isSolo: false,
      }),
    ).toEqual({ allowed: false, reason: 'SELF_REVIEW_FORBIDDEN' });
  });
});
