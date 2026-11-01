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

## Validation and money rules

Pure money calculations live in `src/domain/money`; reusable strict request schemas and
sanitized validation errors live in `src/validation`. Money is parsed and calculated with
decimal arithmetic, never rounded, and every amount retains its currency—USD and LBP are
never added together. Request schemas reject unknown keys and return normalized two-decimal
money strings. To change currency, denomination, or amount limits, edit
`src/domain/money/config.ts`.
