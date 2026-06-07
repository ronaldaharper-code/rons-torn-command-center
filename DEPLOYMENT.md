# Deployment Guide

This project is designed for Vercel deployment with server-side Torn API integration and environment secrets.

## Steps to deploy

1. Create a GitHub repository for `rons-torn-command-center`.
2. Push the project to GitHub.
3. Log in to Vercel and connect your GitHub account.
4. Import the repository into Vercel.
5. Add environment variables in Vercel:
   - `TORN_API_KEY`
   - `DASHBOARD_PASSWORD`
   - `NEXT_PUBLIC_APP_NAME`
   - `DATABASE_URL` (for production, use Vercel Postgres or another hosted database)
6. Deploy the app.

## Required Vercel environment variables

- `TORN_API_KEY`: Your Torn API key. This must remain secret and must not be exposed in client-side code.
- `DASHBOARD_PASSWORD`: The password used for private `/admin` and `/settings` access.
- `NEXT_PUBLIC_APP_NAME`: Display name for the app.
- `DATABASE_URL`: Production database connection string. For local development use `file:./dev.db`, but for Vercel use a hosted Postgres database.

## Notes

- Torn API calls are performed server-side only.
- The app uses internal server routes at `/api/torn/*` and `/api/settings`.
- `.env.local` is ignored by Git.
- If you plan to keep snapshots in production, configure Vercel Postgres or another hosted database and update `DATABASE_URL`.
