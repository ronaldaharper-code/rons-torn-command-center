# Ron’s Torn Command Center

A personal Torn dashboard built with Next.js, TypeScript, Tailwind CSS, and server-side Torn API integration.

## What this app does

- Public share page at `/` for friends and allies.
- Private admin dashboard at `/admin` with a simple password gate.
- Settings page at `/settings` for consumable watchlist thresholds.
- Server-side Torn API proxy routes under `/api/torn/*`.
- Torn API key is stored only in environment variables and never exposed to client-side code.
- Local persistence with Prisma/SQLite for watchlist settings and snapshots.

## Run locally

1. Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

2. Install dependencies:

```bash
npm install
```

3. Generate Prisma client:

```bash
npx prisma generate
```

4. Run the development server:

```bash
npm run dev
```

5. Open http://localhost:3000


## Required environment variables

Create `.env.local` with:

```env
TORN_API_KEY=your_torn_api_key_here
DASHBOARD_PASSWORD=your_dashboard_password
NEXT_PUBLIC_APP_NAME=Ron’s Torn Command Center
DATABASE_URL=file:./dev.db
```

## Deployment

See `DEPLOYMENT.md` for detailed GitHub and Vercel deployment instructions.

## How to update

1. Make your code changes.
2. Run lint and build checks:

```bash
npm run lint
npm run build
```

3. Commit and push to GitHub.
4. Vercel will redeploy automatically after push.

## Project structure

- `src/app/` – app routes, pages, and API route handlers
- `src/components/` – reusable dashboard components
- `src/lib/` – Torn service, caching, and database helper functions
- `prisma/` – database schema and migration support

## Notes

- Do not commit `.env.local`.
- The Torn API key is server-only and not exposed to browser JavaScript.
- Use `/admin` and `/settings` only after logging in with `DASHBOARD_PASSWORD`.
- The app is designed to run on Vercel with secure environment variables.
