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

- `SMTP_HOST`: `smtp.gmail.com`.
- `SMTP_PORT`: `465` (implicit TLS, with normal certificate verification).
- `SMTP_USER`: the sender's full Gmail address.
- `SMTP_PASS`: a Google App Password for that Gmail account, never its normal password.
- `EMAIL_FROM`: `CashUp <the_sender_gmail_address>`, matching `SMTP_USER`.
- `RESET_CODE_SECRET`: an independent cryptographically random secret of at least
  32 bytes; use the same value on every instance. Rotation invalidates pending codes.
- `RECOVERY_IP_HEADER`: optional header overwritten by your trusted ingress with
  the client IP. Configure the proxy to strip client-supplied values. Do not set
  this to an untrusted forwarded header. If unset, clients share the conservative
  `unknown` IP bucket (30 requests/hour), in addition to email and global limits.

Enable Google 2-Step Verification and create a [Google App Password](https://support.google.com/accounts/answer/185833)
for the sender account (account policy must allow App Passwords). Configure the five
SMTP/email variables above in Vercel for the environments that send recovery email.
Keep the existing `RESET_CODE_SECRET` unchanged. `RESEND_API_KEY` is obsolete for the
application and can be removed from Vercel; no Resend sender-domain verification is
needed for Gmail SMTP.

The existing server-only email helper uses Nodemailer and awaits `sendMail`, with
SMTP debug/logger output disabled. See [Nodemailer SMTP configuration](https://nodemailer.com/smtp).
SMTP has no equivalent to Resend's provider idempotency key; the helper retains its
three-argument interface and performs one send without retries. Message subject and
body are unchanged. Existing recovery error handling still returns generic public
responses and invalidates a failed delivery's challenge. Tests mock Nodemailer and
never connect to SMTP or send email.

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

Run `npm run dev` with the configured development database and Gmail SMTP sender, then:

1. Sign out and open `/login`; select **Forgot password?**.
2. Enter an existing local development account's email and select **Send reset code**.
   Confirm the generic message, code input and 60-second resend countdown appear.
3. Check the recipient's inbox/spam. Paste the latest six-digit code
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

For a no-email diagnostic using the same development environment loading and
transport configuration as delivery, run:

```sh
node --conditions=react-server scripts/password-recovery-diagnostic.cjs
```

It reports missing variable names, SMTP port/secret validity, sanitized
`transport.verify()` results and, after SMTP succeeds, read-only database transaction
and recovery-schema checks. It does not send an email, spend a reset budget, create
a challenge, or modify account data. TLS certificate verification remains enabled.
Error output includes only allowlisted name/message/code/command/responseCode details;
unknown free-form messages, SMTP arguments, replies, SQL, configuration and stacks
are omitted to avoid disclosing credentials or recovery data.

The email-request smoke runner now checks SMTP variables instead of the obsolete
Resend key. Unlike the diagnostic above, it sends a real request and should only be
run manually when that is intended.

`reset-request` failures can occur before SMTP. In particular,
`Recovery secret is not configured` is raised before opening a database transaction
when `RESET_CODE_SECRET` is missing or shorter than 32 bytes. Email delivery errors
are caught separately and logged as `reset-email`. Keep an existing secret intact;
when adding a missing secret to local `.env`, restart the application so it reloads
the environment. The runtime and diagnostic follow `.env.local` precedence over `.env`.

The generic service response alone does **not** establish delivery: cooldowns,
limits and provider failures can also return it. Check the recipient's inbox/spam.
Automated checks must mock delivery and never run a live reset request.

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
