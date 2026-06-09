# Deployment Guide

This project deploys to Vercel with server-side Torn API integration, a Neon (Postgres) database, and environment secrets.

## Database

The app uses **Neon Postgres** (provisioned via the Vercel Neon integration). Prisma manages the schema. The `prisma/schema.prisma` uses a split-URL pattern:

- `POSTGRES_PRISMA_URL` — pooled connection (used at runtime by Prisma Client)
- `DATABASE_URL_UNPOOLED` — direct connection (used by `prisma migrate deploy` at build time)

Both are automatically set by the Vercel Neon integration for all environments (Production, Preview, Development).

**To apply schema changes in production**, run `prisma migrate deploy` (not `dev`). The build command below handles this automatically.

## Build command

```
npx prisma migrate deploy && npm run build
```

Update `vercel.json`'s `buildCommand` to this before deploying, so schema migrations run automatically on every deploy.

## Required Vercel environment variables

These are **already configured** on the Vercel project. Do not remove them.

| Variable | Type | Set by |
|---|---|---|
| `POSTGRES_PRISMA_URL` | Sensitive (Neon integration) | Auto — Neon integration |
| `DATABASE_URL_UNPOOLED` | Sensitive (Neon integration) | Auto — Neon integration |
| `DATABASE_URL` | Sensitive (Neon integration) | Auto — Neon integration |
| `TORN_API_KEY` | Sensitive | Manual (Preview + Production only) |
| `DASHBOARD_PASSWORD` | Sensitive | Manual (Preview + Production only) |
| `NEXT_PUBLIC_APP_NAME` | Plain | Add manually if desired (has code fallback: "Ron's Torn Command Center") |

> **Important:** `TORN_API_KEY` and `DASHBOARD_PASSWORD` are stored as **sensitive** (write-only) on Vercel — their values cannot be read back via CLI or dashboard once set. If either needs to be rotated, use `vercel env add` to overwrite it.

## Deploying

1. Push latest code + migrations to GitHub (the Vercel project auto-deploys on push to `main`).
2. Confirm `vercel.json`'s `buildCommand` includes `prisma migrate deploy`.
3. Verify the production URL loads after the deployment completes.

## Local development

For local dev, `.env.local` is required (gitignored — never committed). It must contain:

```
POSTGRES_PRISMA_URL=...  # from Vercel: vercel env pull
DATABASE_URL_UNPOOLED=...
DATABASE_URL=...
TORN_API_KEY=...          # enter manually — cannot be pulled (sensitive)
DASHBOARD_PASSWORD=...    # enter manually — cannot be pulled (sensitive)
NEXT_PUBLIC_APP_NAME="Ron's Torn Command Center"
```

Run `npx vercel env pull --environment=development` to populate the Neon vars. Add `TORN_API_KEY` and `DASHBOARD_PASSWORD` manually (they are sensitive and cannot be pulled).

Run `npx prisma migrate dev` to apply any new migrations locally.

## Notes

- Torn API calls are performed server-side only. The API key is never sent to the client.
- All database writes use the pooled `POSTGRES_PRISMA_URL` connection. Migrations use `DATABASE_URL_UNPOOLED` (direct).
- `.env.local` is gitignored. The `prisma/dev.db` SQLite file (from the original local-only setup) is also gitignored and no longer used.
- Snapshot history, watchlist items, settings (War Readiness, Property Advisor), and all user-configurable state persist in Neon Postgres across deployments.
