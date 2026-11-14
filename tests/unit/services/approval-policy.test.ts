import { MembershipRole } from '../../../src/generated/prisma/enums';
import { canReview, selectReviewerRole } from '../../../src/modules/auth/auth.service';
describe('cash-up approval policy', () => {
    const roles = Object.values(MembershipRole);
    it.each(roles.flatMap((reviewer) => roles.flatMap((cashUpOwner) => [false, true].map((isSolo) => [reviewer, cashUpOwner, isSolo] as const))))('applies the reviewer-role table for %s reviewing %s / solo=%s', (reviewer, cashUpOwner, isSolo) => {
        const expectedRole = selectReviewerRole(cashUpOwner, isSolo);
        const decision = canReview({
            reviewer,
            reviewerMembershipId: 'reviewer-id',
            cashUpOwner,
            ownerMembershipId: 'owner-id',
            isSolo,
        });
        if (expectedRole === reviewer || (reviewer === 'OWNER' && cashUpOwner === 'STAFF')) {
            expect(decision).toEqual({ allowed: true, selfApproved: false });
        }
        else {
            expect(decision).toEqual({ allowed: false, reason: 'WRONG_REVIEWER_ROLE' });
        }
    });
    it('allows an owner to review staff without requiring a manager or solo business', () => {
        expect(canReview({ reviewer: 'OWNER', reviewerMembershipId: 'owner-membership',
            cashUpOwner: 'STAFF', ownerMembershipId: 'staff-membership', isSolo: false,
        })).toEqual({ allowed: true, selfApproved: false });
    });
    it('allows only solo Owner self-approval', () => {
        expect(canReview({
            reviewer: 'OWNER',
            reviewerMembershipId: 'owner-id',
            cashUpOwner: 'OWNER',
            ownerMembershipId: 'owner-id',
            isSolo: true,
        })).toEqual({ allowed: true, selfApproved: true });
        expect(canReview({
            reviewer: 'MANAGER',
            reviewerMembershipId: 'same-id',
            cashUpOwner: 'STAFF',
            ownerMembershipId: 'same-id',
            isSolo: false,
        })).toEqual({ allowed: false, reason: 'SELF_REVIEW_FORBIDDEN' });
        expect(canReview({ reviewer: 'OWNER', reviewerMembershipId: 'same-id',
            cashUpOwner: 'STAFF', ownerMembershipId: 'same-id', isSolo: false,
        })).toEqual({ allowed: false, reason: 'SELF_REVIEW_FORBIDDEN' });
        expect(canReview({ reviewer: 'STAFF', reviewerMembershipId: 'same-id',
            cashUpOwner: 'STAFF', ownerMembershipId: 'same-id', isSolo: false,
        })).toEqual({ allowed: false, reason: 'WRONG_REVIEWER_ROLE' });
    });
});
