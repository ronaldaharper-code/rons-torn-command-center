# Security Notes

This project follows a secure Torn dashboard pattern:

- Torn API key is stored in `TORN_API_KEY` and used only on the server.
- The app never exposes the Torn API key to browser code.
- `.env.local` and `.env.*.local` are ignored in Git.
- `NEXT_PUBLIC_APP_NAME` is the only public environment variable.
- The admin dashboard and settings pages are protected by `DASHBOARD_PASSWORD` and a server-set cookie.
- Torn API calls are routed through server-side endpoints under `/api/torn/*`.
- Sensitive inventory and private information are not exposed on the public landing page.
- The project uses environment-based secrets and server-only code for API requests.
- Use Vercel environment secrets for production values.
