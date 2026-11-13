# Password recovery backend

Recovery uses CashUp's local authentication, Server Actions, PostgreSQL repositories,
Argon2id options and database sessions. GOOGLE-only and ambiguous case-folded accounts
are ineligible. No API routes are used. The frontend uses the existing auth layout
and shared Alert, Button and TextField components.

Recovery actions share `src/app/(auth)/actions.ts` and its error handler with
login/signup. Recovery schemas and input types live in `auth.validation.ts`,
reusing normalized email and the signup password schema. The substantial recovery
workflow, database queries and server-only email integration remain in
`password-recovery.service.ts`, `password-recovery.repository.ts` and
`password-recovery.email.ts` within the existing auth module. Cookie handling,
hashing options and sanitized diagnostics reuse the existing auth helpers.

## Setup

Set these server-only variables using `.env.example`:

- `RESEND_API_KEY`: a Resend sending key.
- `EMAIL_FROM`: for example `CashUp <passwords@auth.your-domain.com>`.
- `RESET_CODE_SECRET`: an independent cryptographically random secret of at least
  32 bytes; use the same value on every instance. Rotation invalidates pending codes.
- `RECOVERY_IP_HEADER`: optional header overwritten by your trusted ingress with
  the client IP. Configure the proxy to strip client-supplied values. Do not set
  this to an untrusted forwarded header. If unset, clients share the conservative
  `unknown` IP bucket (30 requests/hour), in addition to email and global limits.

Verify your sender domain in Resend and publish its required SPF/DKIM DNS records
before sending to real users. See [Resend domain setup](https://resend.com/docs/dashboard/domains/introduction).
The helper uses [Resend's send endpoint](https://resend.com/docs/api-reference/emails/send-email)
directly; it needs no new package. Tests mock email delivery and never send email.

## Migration

The reviewable additive SQL migration is
`prisma/migrations/20261113000000_password_recovery/migration.sql`.
It extends the existing unused reset-token table with code digest, attempts and
verification state, invalidates legacy tokens, and adds a partial unique index
for one unused challenge per account. Existing RLS remains enabled.

After reviewing `DIRECT_URL` for the intended database, run:

```sh
npm run prisma:generate
npm run db:migrate:deploy
```

No database reset or `db push` is needed. This migration was prepared without
connecting to a development database and has not been applied by this task.

## Frontend flow

The existing login link opens `/forgot-password`. Its existing form now contains
three steps, connected to actions in `src/app/(auth)/actions.ts`:

1. Email calls `requestPasswordResetAction({ email })`. Success retains normalized
   email in component state and displays the action's generic message with code entry.
2. Verification calls `verifyPasswordResetAction({ email, code })`. The single text
   field accepts a pasted six-digit code and preserves leading zeros. Only a successful
   action advances to password entry.
3. Password entry calls `resetPasswordAction({ password, confirmPassword })`, using
   the shared signup policy (8–128 characters, no normalization). Success clears
   sensitive form state and redirects to `/login?passwordReset=success`, where the
   existing Alert component displays a confirmation. The query marker carries only
   feedback, never authorization or password data.

Each mutation disables controls and blocks duplicate submissions while pending.
Field errors and action messages are displayed through the shared UI components.
Resend calls the request action, clears the entered code and starts a visible
60-second cooldown on success. Backend limits remain authoritative. Start over
returns to email entry and clears code/password fields while retaining the cooldown.
This also provides recovery from expired codes and expired reset authorization.

All actions return `{ ok: true, message?: string }` or
`{ ok: false, message: string, fields?: Record<string, string> }`.
Verification and reset successes contain no secret. Verification sets an HttpOnly,
SameSite=Lax, production-Secure cookie valid for ten minutes. No reset authorization
is accepted from client input, a URL, localStorage, email or a client verification flag.
Server Actions retain Next.js's origin/CSRF protections.

### Manual complete-flow check

Run `npm run dev` with the configured development database and Resend sender, then:

1. Sign out and open `/login`; select **Forgot password?**.
2. Enter an existing local development account's email and select **Send reset code**.
   Confirm the generic message, code input and 60-second resend countdown appear.
3. Check inbox/spam and the Resend Emails dashboard. Paste the latest six-digit code
   (including any leading zeros) and select **Verify code**.
4. Enter matching new passwords of 8–128 characters and select **Reset password**.
   Confirm login opens with the success Alert; sign in with the new password.

Also check a wrong code stays on verification, mismatched passwords show an error,
and resend after 60 seconds clears code entry and invalidates the previous code.
For expiry checks, wait over ten minutes before verifying or submitting a verified
reset; confirm the error provides a working Start over path. Reloading intentionally
returns to email entry because recovery form state is held only in memory.

## Behavior and operations

Codes are uniformly random six-digit strings, expire after ten minutes and are
stored only as an HMAC bound to challenge ID and user ID. A resend invalidates
both old codes and reset authorization. Verification consumes the code, persists
at most five failed attempts and grants a fresh ten-minute authorization. User-row
locks and conditional consumption prevent concurrent verification/reset reuse.

Shared `auth_attempts` rows enforce 60 seconds between accepted requests, five
requests per email/hour, 30 per IP/hour and 1,000 globally/hour. The hourly windows
start at the first attempt. Attempts during cooldown also spend the hourly budget.
Account limits and provider failures return the same public request message.
Expired recovery-budget rows are pruned on requests; no process-local limiter is used.

Successful reset hashes the password, consumes authorization, invalidates remaining
challenges and revokes every stored session in one transaction, without signing in.
Login takes the same user lock and rechecks the credential hash before creating a
session, so a login already verifying an old password cannot escape revocation.
Already-running requests that previously read a session may finish; subsequent
session reads reject revoked sessions.

Email failures are logged with safe operation/error-type metadata and the affected
challenge is invalidated where the database is available. If cleanup itself fails,
that failure is logged too; the challenge still expires normally. No provider body,
recipient, password, code, token or API key is logged. Database outages return a
generic action failure rather than a success claim.

## Verification

For a temporary, manual email-only smoke test, run from the project root with an
existing local development account's email (Node >=22.15):

```sh
node --conditions=react-server scripts/password-recovery-smoke.cjs "you@example.com"
```

The runner follows `dev-staff-seed.cjs` environment loading (`@next/env`, including
development `.env.local` precedence), checks account eligibility, calls the real
request service once, and closes Prisma. It preserves the `server-only` package's
actual `react-server` condition and uses installed TypeScript for module loading.
It does not mock delivery, create accounts, change passwords, verify codes, touch
cookies, retry, or bypass limits. It shares the service's default IP bucket.

The generic service response alone does **not** establish delivery: cooldowns,
limits and provider failures can also return it. Check the inbox/spam folder and
the Resend Emails dashboard. This manual request sends at most one real reset
email; automated checks must not run it with a real recipient.

```sh
npm test -- --runInBand
npm run typecheck
npm run lint
npm run build
npm run test:integration -- --runInBand tests/integration/services/password-recovery.int.test.ts
```

Integration tests use the repository's disposable PostgreSQL setup and mock email.
These focused tests create isolated randomly named fixtures and do not reset tables.
The integration harness applies migrations to the disposable test database. The
database suite requires Docker with a running daemon or `TEST_DATABASE_URL` pointing
to the repository's dedicated local service: database/user/password `cashup_test`,
localhost port `55432`, and no URL query parameters. Never use a development or
production database.
