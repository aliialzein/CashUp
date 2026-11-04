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
disposable database whose name contains `test`. If it is unset, the integration test setup
starts the PostgreSQL 16 service in `docker-compose.test.yml`.

## Concurrency rules

Every cash-up write runs inside `uow.run` and locks that cash-up row before other row locks.
The submit flow must be `uow.run` -> `cashUps.lockForUpdate(id)` -> read aggregates
(`sales.totalsByCurrencyAndMethod`, `sales.changeGivenByCurrency`, `cashOuts.totalsByCurrency`,
and `counts.countedTotals`) -> `cashUps.submit(id, snapshot)`. This keeps the snapshot and
the submitted cash-up consistent with concurrent sale, cash-out, and count writes.

## Services

`src/services` contains the business use cases, authorization policy, DTO mappers, and audit
recording. Resolve an active membership with `ActorResolver`, then call services created by
`createServices(uow)`. Lifecycle mutations, row locks, and their audit records run in the same
unit-of-work transaction; callers receive serializable DTOs rather than Prisma records.

`CashUpQueryService.getOwn` and `getReviewDetail` include all sales ordered by sale number.
Each line distinguishes money already collected from a delivery amount still expected at the
door. Reviewers cannot use the detail query to inspect an OPEN cash-up; open summaries omit
amounts and sale details.

## Validation and money rules

Pure money calculations live in `src/domain/money`; reusable strict request schemas and
sanitized validation errors live in `src/validation`. Money is parsed and calculated with
decimal arithmetic, never rounded, and every amount retains its currency—USD and LBP are
never added together. Request schemas reject unknown keys and return normalized two-decimal
money strings. To change currency, denomination, or amount limits, edit
`src/domain/money/config.ts`.

## Seeding a dev business

Run the SQL in `scripts/dev-seed.sql` in the Supabase SQL editor for the dev project only. It creates one multi-user dev business with a fixed Owner, Manager, and two Staff members and is safe to apply repeatedly because every insert uses `ON CONFLICT DO NOTHING`. Set `CASHUP_DEV_AUTH=1` in the local environment before testing with the dev session headers.

## HTTP API

The versioned API base path is `/api/v1`; a future breaking contract can be introduced at
`/api/v2`. Every success response has the form `{ "data": ... }`. Cursor-paged endpoints also
return `{ "page": { "nextCursor": string | null } }`. Every response includes `X-Request-Id`
and `Cache-Control: no-store`; errors use `{ "error": { "code", "message", "requestId",
"details"? } }`. Validation details are sanitized and never contain submitted values.

Authentication is a temporary, fail-closed development stub pending task 4D. Outside production,
it accepts `x-dev-user-id` and `x-dev-business-id` only when `CASHUP_DEV_AUTH=1`; it always rejects
in production. These values are consumed by the session provider, and handlers use only the
resulting session identity—never client-supplied body or query identity. Set `CASHUP_DEV_AUTH=1`
only in an appropriately protected local development environment; do not enable this stub in
production.

| Method and path | Purpose | Request | Success |
|---|---|---|---|
| `POST /api/v1/cash-ups` | Open the current actor's cash-up. | `openCashUpSchema` JSON body; optional `Idempotency-Key`. | `201`, `Location: /api/v1/cash-ups/{id}` |
| `GET /api/v1/cash-ups` | List own cash-ups. | `pageQuery` (`take`, `cursorId`). | `200`, paged data |
| `GET /api/v1/cash-ups/{id}` | Read own cash-up, sales, and sales summary. | UUID path ID. | `200` |
| `POST /api/v1/cash-ups/{id}/submit` | Submit own cash-up. | UUID path ID; no body. | `200` |
| `POST /api/v1/cash-ups/{id}/sales` | Record a paid-now or to-deliver sale. | `createSaleSchema`; required UUID `Idempotency-Key`. | `201`, `Location` to the sale; replay `200` |
| `PATCH /api/v1/cash-ups/{id}/sales/{saleId}` | Edit a sale while the cash-up is OPEN. | Partial `editSaleSchema`. | `200` |
| `POST /api/v1/cash-ups/{id}/sales/{saleId}/confirm-delivery` | Confirm a to-deliver sale. | `confirmDeliverySchema`. | `200` |
| `POST /api/v1/cash-ups/{id}/sales/{saleId}/cancel` | Cancel a to-deliver sale. | `{ "reason": "..." }`. | `200` |
| `POST /api/v1/cash-ups/{id}/cash-outs` | Record a cash-out. | `createCashOutSchema`; required UUID `Idempotency-Key`. | `201`, `Location` to the cash-out; replay `200` |
| `POST /api/v1/cash-ups/{id}/cash-outs/{cashOutId}/cancel` | Cancel a cash-out while the cash-up is OPEN. | `{ "reason": "..." }`. | `200` |
| `PUT /api/v1/cash-ups/{id}/count` | Replace the draft count working set in one transaction. | `{ "lines": [...] }`; empty arrays are valid to zero the working set. | `200` |
| `GET /api/v1/review/cash-ups/open` | List open cash-up summaries without amounts. | None. | `200` |
| `GET /api/v1/review/cash-ups/submitted` | List submitted cash-ups visible to the reviewer. | None. | `200` |
| `GET /api/v1/review/cash-ups/reviewed` | List reviewed history. | `cashUpHistoryQuerySchema`. | `200`, paged data |
| `GET /api/v1/review/cash-ups/{id}` | Read review detail, totals, and flags. | UUID path ID. | `200` |
| `POST /api/v1/review/cash-ups/{id}/approve` | Approve a submitted cash-up. | UUID path ID; no body. | `200` |
| `POST /api/v1/review/cash-ups/{id}/return` | Return a submitted cash-up to OPEN. | UUID path ID; `{ "reason": "..." }`. | `200` |

Example open request and response (IDs and amounts are illustrative):

```http
POST /api/v1/cash-ups
Content-Type: application/json
Idempotency-Key: open_20261103_shift1

{ "floatUsd": "20.00", "floatLbp": "0.00" }
```

```json
{
  "data": {
    "id": "e2461a3b-6449-4dfb-94b6-aed839bac5aa",
    "status": "OPEN",
    "floatUsd": "20.00",
    "floatLbp": "0.00"
  }
}
```

Example amount-free reviewer summary:

```json
{
  "data": [
    {
      "id": "e2461a3b-6449-4dfb-94b6-aed839bac5aa",
      "openedAt": "2026-11-03T10:00:00.000Z",
      "staffName": "Example cashier",
      "salesCount": 0,
      "requestsCount": 0
    }
  ]
}
```

Example paged own-history response (cash-up fields abbreviated):

```http
GET /api/v1/cash-ups?take=1
```

```json
{
  "data": [
    {
      "id": "e2461a3b-6449-4dfb-94b6-aed839bac5aa",
      "status": "OPEN",
      "floatUsd": "20.00",
      "floatLbp": "0.00"
    }
  ],
  "page": { "nextCursor": "e2461a3b-6449-4dfb-94b6-aed839bac5aa" }
}
```

Example `GET /api/v1/cash-ups/{id}` detail includes each sale's UUID as `id`. Sale mutation
responses continue to include the same UUID as top-level `saleId` for compatibility:

```json
{
  "data": {
    "sales": [
      {
        "id": "a3f1212c-b061-4f82-90c5-e057aa8fd564",
        "saleNumber": 1,
        "status": "DELIVERED",
        "moneyTaken": "COLLECTED",
        "amountCollected": "12.00"
      }
    ]
  }
}
```

Example whole-count replacement response uses two-decimal strings for denominations and totals:

```http
PUT /api/v1/cash-ups/e2461a3b-6449-4dfb-94b6-aed839bac5aa/count
Content-Type: application/json

{ "lines": [{ "currency": "USD", "denomination": "5", "quantity": 2 }] }
```

```json
{
  "data": {
    "cashUpId": "e2461a3b-6449-4dfb-94b6-aed839bac5aa",
    "lines": [{ "currency": "USD", "denomination": "5.00", "quantity": 2 }],
    "countedTotals": { "USD": "10.00", "LBP": "0.00" }
  }
}
```

Example reviewer return command:

```http
POST /api/v1/review/cash-ups/e2461a3b-6449-4dfb-94b6-aed839bac5aa/return
Content-Type: application/json

{ "reason": "Please recount the float." }
```

It returns `200` with the updated cash-up in the standard `{ "data": ... }` envelope.

HTTP errors map validation to 400 (`VALIDATION_ERROR`), unauthenticated sessions to 401,
forbidden actions to 403, missing resources to 404, state conflicts to 409, business-rule
violations to 422, unsupported media types to 415, oversized bodies to 413, and unexpected
failures to a generic 500 (`INTERNAL_ERROR`). Service errors retain their stable machine code
where available. Invalid JSON returns 400 (`INVALID_JSON`).

`Idempotency-Key` is optional for opening and is scoped to the current session, method, and route.
The key must contain 8–128 ASCII letters, digits, underscores, or hyphens. Reusing a key with a
different normalized body returns 422 (`IDEMPOTENCY_KEY_MISMATCH`); a matching in-progress
request returns 409 (`IDEMPOTENCY_IN_PROGRESS`), and a replay includes
`Idempotent-Replayed: true`. The current store is an explicitly temporary in-memory stub: it only
deduplicates within one process and is not safe for serverless or multi-instance deployment.
That in-memory store is used for opening only. Sale and cash-out creates require a UUID
`Idempotency-Key` header and use the persistence entity key instead; a matching replay returns
`200` with `Idempotent-Replayed: true`, while reusing the key with different content returns
`409` (`IDEMPOTENCY_KEY_REUSED`). The entity key is independent of the in-memory store.

Staff writes are restricted to the opener's own cash-up and only while it is OPEN. A Manager may
write their own Manager-staffed cash-up; a solo Owner may act as Staff on their own cash-up.
Reviewers cannot mutate another person's cash-up. Another person's cash-up remains indistinguishable
from a missing one (404); writes to SUBMITTED or APPROVED cash-ups are rejected. Returned cash-ups
are OPEN again. In the current persistence model, direct cancellation is supported only for
TO_DELIVER sales; cancelling a collected sale still uses the existing review-request workflow.
Cash-out cancellation and whole-count replacement are supported while the cash-up is OPEN.

### Running a full cash-up manually

The REST Client examples in [`docs/cashup.http`](./docs/cashup.http) exercise the currently
implemented Staff and reviewer routes. A `dev:seed` command is not available yet: public
persistence entry points for creating development users, businesses, and memberships are not
implemented. Count replacement is available through the guarded `PUT /api/v1/cash-ups/{id}/count`
route.

Transition endpoints use `POST /.../{verb}` sub-resources rather than `PATCH status` because
transitions are commands with rules and side effects; clients cannot set arbitrary statuses.
Reviewer routes have a separate namespace because reviewers receive different response shapes
and authorization than the owner, while `/cash-ups/{id}` always refers to the current actor's own
cash-up. The three reviewer lists have separate paths because they return distinct DTO shapes,
including the amount-free `OpenCashUpSummaryDto`. Versioning under `/api/v1` leaves room for
breaking changes at `/api/v2`.

To add a later endpoint, create a thin `route.ts` under `src/app/api/v1` and add a single
`defineRoute(...)` entry to the relevant route factory in `src/http/routes/`; keep identity,
validation, error mapping, and response envelopes shared. When cookie sessions arrive in task
4D, add an Origin/CSRF check in the session layer for mutating routes and replace the in-memory
idempotency store with durable storage.
