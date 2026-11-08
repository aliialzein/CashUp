This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Persistence

Set `DATABASE_URL` to the pooled PostgreSQL connection for the application and `DIRECT_URL`
to the direct connection on port 5432 for Prisma migrations. Copy `.env.example` to `.env`
and replace its placeholders; do not use a production URL for tests.

Run `npm run prisma:generate` to generate the Prisma client and `npm run db:migrate:deploy`
to apply committed migrations. Integration tests require `TEST_DATABASE_URL` to point to a
the configured disposable local `cashup_test` database on port 55432. If it is unset, the integration test setup
starts the PostgreSQL 16 service in `docker-compose.test.yml`.

## Concurrency rules

Every cash-up write runs inside a service-owned Prisma transaction and locks that cash-up row before other row locks.
The submit flow must be `prisma.$transaction` -> `cashUps.lockForUpdate(id)` -> read aggregates
(`sales.totalsByCurrencyAndMethod`, `sales.changeGivenByCurrency`, `cashOuts.listByCashUp`,
and `counts.countedTotals`) -> `cashUps.submit(id, snapshot)`. This keeps the snapshot and
the submitted cash-up consistent with concurrent sale, cash-out, and count writes.

## Services

Business features live under `src/modules`: business (including membership and join codes),
cash-ups (including counts and review), sales, cash-outs, and audit. Each feature keeps its
one function-based service, one concrete repository file, validation and contracts together. Identity and
permissions live in `src/modules/auth`; errors and reusable validation live under `src/shared`.

Call an operation such as `getOwnCashUp(id)` directly. Services resolve active membership
internally through `auth.service.ts`. Services own transaction boundaries and pass
the same Prisma transaction client to their repositories. Every business repository requires
an explicit business ID; child queries scope through their parent. `getPrisma()` in
`src/shared/db/prisma.ts` supplies one lazy shared runtime pool. Services and repositories
are server-only. See `docs/modular-backend.md` for examples and transition/deletion notes.

`getOwnCashUp` and `getCashUpReview` include all sales ordered by sale number.
Each line distinguishes money already collected from a delivery amount still expected at the
door. Reviewers cannot use the detail query to inspect an OPEN cash-up; open summaries omit
amounts and sale details.

## Validation and money rules

Pure money calculations live in `src/domain/money`; reusable strict request schemas and
sanitized validation errors live in `src/shared/validation`; feature schemas live next to their services. Money is parsed and calculated with
decimal arithmetic, never rounded, and every amount retains its currency—USD and LBP are
never added together. Request schemas reject unknown keys and return normalized two-decimal
money strings. To change currency, denomination, or amount limits, edit
`src/domain/money/config.ts`.

## Seeding a dev business

Run the SQL in `scripts/dev-seed.sql` in the Supabase SQL editor for the dev project only. It creates one multi-user dev business with a fixed Owner, Manager, and two Staff members and is safe to apply repeatedly because every insert uses `ON CONFLICT DO NOTHING`. Seeded users are not login credentials. Use the real signup flow; no development identity override remains.

## Application calls

Server Components call feature services for reads. Thin Server Actions validate commands and call feature services for writes. Services resolve the current session/member internally, enforce permissions and lifecycle rules, and call concrete repositories. Repositories own Prisma queries; financial calculations remain in the pure money domain.

The internal REST API and its transport infrastructure have been removed. Login, signup, logout and business onboarding use the existing Server Actions. Driver integration is deferred; owner business pages still use their existing view models.

Sale/cash-out creation commands retain required UUID idempotencyKey values and database uniqueness. Reuse a key for retries of the same command. Mutable-sale retries may fail with IDEMPOTENCY_REPLAY_UNVERIFIABLE; closed-record retries still fail lifecycle checks. No opening-response cache or transport replay store remains. See [service contracts](docs/service-consolidation.md), [local auth](docs/local-auth.md), and [transport removal](docs/transport-removal.md).

### PostgreSQL integration tests

Run `npm run test:integration` separately from the fast `npm test -- --runInBand` suite.
The integration setup starts `docker compose --file docker-compose.test.yml up --detach`
when `TEST_DATABASE_URL` is absent, waits for PostgreSQL, and applies existing migrations.
Docker must be running. Missing Docker or PostgreSQL fails the command; tests are never silently skipped.

Only the dedicated disposable service is accepted: database/user/password `cashup_test`,
localhost port `55432`, with no URL query parameters. CI supplies the same PostgreSQL 16 service.
Never point this suite at a development or production database: fixtures reset its tables.
The Compose service uses tmpfs; after testing, stop it with
`docker compose --file docker-compose.test.yml down` to discard its data.
