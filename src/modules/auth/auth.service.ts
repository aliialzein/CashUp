import { cookies } from 'next/headers';
import { connection } from 'next/server';
import { createHash, randomBytes } from 'node:crypto';
import { hash, verify, argon2id } from 'argon2';
import { getPrisma } from '../../shared/db/prisma';
import { isUniqueViolation } from '../../shared/errors/persistence-errors';
import { readSession, createSession, revokeSession, usersMatchingEmail, createLocalUser, lockSignupEmail } from './auth.repository';
import { AuthFailure, type CurrentUser } from './auth.types';
import { signupSchema, loginSchema, type SignupInput, type LoginInput } from './auth.validation';
import { consumeAuthAttempt } from './auth.repository';
import 'server-only';
import { BusinessRuleError, ForbiddenError, UnauthenticatedError } from '../../shared/errors/service-errors';
import { findActiveMembership, lockMembership } from './auth.repository';
import type { Db } from '../../shared/db/types';
import type { CurrentIdentity, CurrentMember, ReviewDecision, ReviewParticipants } from './auth.types';
import type { MembershipRole } from '../../generated/prisma/enums';

export const SESSION_COOKIE = 'cashup_session';
const SESSION_AGE = 7 * 24 * 60 * 60 * 1000;
const HASH_OPTIONS = { type: argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;
const sessionHash = (token: string) => createHash('sha256').update(token).digest('hex');
const validToken = (token: string | undefined): token is string => !!token && /^[a-f0-9]{64}$/.test(token);

export async function getCurrentUser(): Promise<CurrentUser | null> {
  // Session expiry and database reads are request-time work with Cache Components enabled.
  await connection();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!validToken(token)) return null;
  const session = await readSession(sessionHash(token));
  if (!session) return null;
  const user = session.user;
  return { id: user.id, email: user.email, fullName: user.fullName, membership: user.memberships[0] ?? null };
}

export async function requireCurrentIdentity(): Promise<CurrentIdentity> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthenticatedError();
  return { userId: user.id, businessId: user.membership?.businessId };
}

function cookieOptions(expires: Date) {
  return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', expires };
}

// Fixed windows are persisted atomically; rejected attempts never create account keys.
async function limitAuthAttempt(operation: 'login' | 'signup', email: string): Promise<void> {
  const emailHash = createHash('sha256').update(email).digest('hex');
  const allowed = await getPrisma().$transaction(tx => consumeAuthAttempt(operation, emailHash, tx));
  if (!allowed) throw new AuthFailure('TOO_MANY_ATTEMPTS');
}

export async function signup(values: SignupInput): Promise<void> {
  const input = signupSchema.parse(values);
  await limitAuthAttempt('signup', input.email);
  const passwordHash = await hash(input.password, HASH_OPTIONS);
  const jar = await cookies();
  const previous = jar.get(SESSION_COOKIE)?.value;
  const raw = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_AGE);
  try {
    await getPrisma().$transaction(async tx => {
      await lockSignupEmail(input.email, tx);
      if ((await usersMatchingEmail(input.email, tx)).length) throw new AuthFailure('SIGNUP_UNAVAILABLE');
      const user = await createLocalUser({ email: input.email, fullName: input.fullName, passwordHash }, tx);
      if (validToken(previous)) await revokeSession(sessionHash(previous), tx);
      await createSession({ tokenHash: sessionHash(raw), userId: user.id, expiresAt }, tx);
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new AuthFailure('SIGNUP_UNAVAILABLE');
    throw error;
  }
  jar.set(SESSION_COOKIE, raw, cookieOptions(expiresAt));
}

export async function login(values: LoginInput): Promise<void> {
  const input = loginSchema.parse(values);
  await limitAuthAttempt('login', input.email);
  const matches = await usersMatchingEmail(input.email);
  const user = matches.length === 1 ? matches[0] : null;
  let correct = false;
  if (user?.provider === 'LOCAL' && user.passwordHash) {
    try { correct = await verify(user.passwordHash, input.password); } catch { await hash(input.password, HASH_OPTIONS); }
  } else { await hash(input.password, HASH_OPTIONS); }
  if (!correct || !user) throw new AuthFailure('INVALID_CREDENTIALS');
  const jar = await cookies();
  const previous = jar.get(SESSION_COOKIE)?.value;
  const raw = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_AGE);
  await getPrisma().$transaction(async tx => {
    if (validToken(previous)) await revokeSession(sessionHash(previous), tx);
    await createSession({ tokenHash: sessionHash(raw), userId: user.id, expiresAt }, tx);
  });
  jar.set(SESSION_COOKIE, raw, cookieOptions(expiresAt));
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  try { if (validToken(token)) await revokeSession(sessionHash(token)); }
  finally { jar.set(SESSION_COOKIE, '', { ...cookieOptions(new Date(0)), maxAge: 0 }); }
}

export function authDestination(user: CurrentUser): string {
  if (!user.membership || user.membership.status !== 'ACTIVE') return '/onboarding';
  switch (user.membership.role) {
    case 'OWNER':
      return '/owner';
    case 'MANAGER':
    case 'STAFF':
      return '/onboarding';
  }
}

export async function requireCurrentMember(): Promise<CurrentMember> {
  const identity = await requireCurrentIdentity();
  return resolveMember(identity);
}

/** Internal trusted-identity lookup; the current identity source is resolved by requireCurrentMember. */
export async function resolveMember(identity: CurrentIdentity): Promise<CurrentMember> {
  if (!identity.businessId) throw new UnauthenticatedError();
  const membership = await findActiveMembership(identity.userId, identity.businessId);
  if (!membership || membership.status !== 'ACTIVE' ||
      membership.userId !== identity.userId || membership.businessId !== identity.businessId) {
    throw new ForbiddenError('ACTOR_NOT_ACTIVE');
  }
  return { userId: membership.userId, membershipId: membership.id, businessId: membership.businessId, role: membership.role };
}

export async function lockCurrentMember(member: CurrentMember, tx: Db): Promise<void> {
  if ((await lockMembership(member, tx)).length !== 1) throw new ForbiddenError('ACTOR_NOT_ACTIVE');
}

export function requireOwnCashUpPermission(member: CurrentMember, isSolo: boolean): void {
  if (member.role === 'OWNER' && !isSolo) throw new ForbiddenError();
}

export function requireManagementPermission(member: CurrentMember): void {
  if (member.role === 'STAFF') throw new ForbiddenError();
}

export function requireOwnerPermission(member: CurrentMember): void {
  if (member.role !== 'OWNER') throw new ForbiddenError();
}

export function requireMemberDeactivationPermission(member: CurrentMember, target: Pick<CurrentMember, 'userId' | 'role'>): void {
  requireManagementPermission(member);
  if (target.userId === member.userId) throw new BusinessRuleError('MEMBER_CANNOT_DEACTIVATE_SELF');
  if ((member.role === 'MANAGER' && target.role !== 'STAFF') ||
      (target.role === 'OWNER' && member.role !== 'OWNER')) {
    throw new ForbiddenError('MEMBER_DEACTIVATION_FORBIDDEN');
  }
}

export function selectReviewerRole(ownerRole: MembershipRole, isSolo: boolean): MembershipRole | null {
  if (ownerRole === 'STAFF') return 'MANAGER';
  if (ownerRole === 'MANAGER') return 'OWNER';
  return isSolo ? 'OWNER' : null;
}
export function canReview(input: ReviewParticipants): ReviewDecision {
  const expectedRole = selectReviewerRole(input.cashUpOwner, input.isSolo);
  if (expectedRole === null || input.reviewer !== expectedRole) {
    return { allowed: false, reason: 'WRONG_REVIEWER_ROLE' };
  }
  const isSelf = input.reviewerMembershipId === input.ownerMembershipId;
  if (!isSelf)
    return { allowed: true, selfApproved: false };
  if (input.isSolo && input.cashUpOwner === 'OWNER' && input.reviewer === 'OWNER') {
    return { allowed: true, selfApproved: true };
  }
  return { allowed: false, reason: 'SELF_REVIEW_FORBIDDEN' };
}

export function canListReviewCashUp(input: ReviewParticipants): boolean {
  if (input.ownerMembershipId === input.reviewerMembershipId && input.reviewer === 'MANAGER') return true;
  return canReview(input).allowed;
}
