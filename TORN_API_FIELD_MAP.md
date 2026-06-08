# Torn API field map

This documents which `/user/` selections this dashboard depends on, what
access level each one needs, and known quirks of the Torn API that affect how
we fetch them. The table below replaces an earlier draft that was based on
guesswork — these results come from testing every selection individually
against a real key (currently a **"Public Only" / access level 1** key — see
"Current key status" below).

To re-run these tests yourself (without ever printing the key), use:

```
npm run verify:torn-api
```

This regenerates [`docs/API_VERIFICATION_RESULTS.md`](docs/API_VERIFICATION_RESULTS.md)
with a fresh per-selection pass/fail table, error codes, messages, and the
top-level fields returned on success — re-run it whenever you swap in a new
key. The summary below was last refreshed from that script's output on
2026-06-08.

Torn API key access levels (from lowest to highest):

| Level | Name            | Notes                                                |
|-------|-----------------|------------------------------------------------------|
| 1     | Public Only     | Safest/default level. Exposes only public profile data. |
| 2     | Minimal Access  | Adds some personal, non-sensitive data.             |
| 3     | Limited Access  | Adds more personal data (varies by selection).      |
| 4     | Full Access     | Exposes nearly everything, including sensitive financial/inventory data. |

**Public is the lowest access level, not the highest** — it intentionally
hides most of what this dashboard needs (net worth, inventory, cooldowns,
battle stats, etc.) because that data is sensitive.

## Selection → requirement → status

Tested individually via `npm run verify:torn-api`, which calls
`GET https://api.torn.com/user/?selections=<selection>&key=<key>` once per
selection (full raw output: [`docs/API_VERIFICATION_RESULTS.md`](docs/API_VERIFICATION_RESULTS.md)):

| Selection      | Used for                  | Result with current key | Error code | Top-level fields returned |
|----------------|---------------------------|--------------------------|------------|----------------------------|
| `basic`        | Name, level, rank, image  | ✅ success               | —          | `level, gender, player_id, name, status` |
| `profile`      | Energy/nerve/happy/life, points, merits | ✅ success | —     | `rank, level, honor, gender, property, signup, awards, friends, enemies, forum_posts, karma, age, role, donator, player_id, name, property_id, revivable, profile_image, life, status, job, faction, married, basicicons, states, last_action, competition` |
| `properties`   | Properties module         | ✅ success               | —          | `properties` |
| `stats`        | Battle stats total        | ❌ fail                  | 16         | — |
| `travel`       | Travel status             | ❌ fail                  | 16         | — |
| `networth`     | Net worth, cash, bank     | ❌ fail                  | 16         | — |
| `inventory`    | Watchlist & usage tracking| ❌ fail                  | 16         | — |
| `weapons`      | Gear module               | ❌ fail                  | 16         | — |
| `armor`        | Gear module               | ❌ fail                  | 16         | — |
| `crimes`       | Crime cooldown signal     | ❌ fail                  | 16         | — |
| `chain`        | Faction chain status      | ❌ fail                  | 16         | — |
| `cooldowns`    | Cooldowns card            | ❌ fail                  | 16         | — |
| `enlistedcars` | Racing/garage module      | ❌ fail                  | 16         | — |

> All ten failing selections return the **same** `code 16: "Access level of
> this key is not high enough"` — Torn doesn't expose finer-grained boundaries
> per selection in the error response itself, so we can't tell from this test
> alone whether each one needs Minimal, Limited, or Full Access individually.
> What we know for certain: Public Only (level 1) covers `basic`, `profile`,
> `properties` and nothing else in this list. Re-run
> `npm run verify:torn-api` with a higher-tier key to narrow this down further
> — each run overwrites `docs/API_VERIFICATION_RESULTS.md` with fresh results.

## Important API quirk: incompatible selection combinations

Independent of access level, the Torn `/user/` endpoint rejects certain
selection *combinations* outright with a generic `code 4: "Wrong fields"`
error — even when each selection works fine individually. Observed conflicts:

- `stats` cannot be combined with `profile`, `travel`, or `networth`
- `weapons`/`armor` cannot be combined with `inventory`, `properties`, or `networth`
- `garage` is not a valid selection name anymore — the API now calls it `enlistedcars`
- `items` is a lookup-style selection (expects an `id` parameter) and isn't meaningful as a plain `/user/` selection

Because of this, **`src/lib/torn.ts` fetches every selection in its own
request** (parallelized via `Promise.all`, each cached for 90–120s) and merges
the results, rather than building one big comma-joined selection string. This
sidesteps the combination conflicts entirely and — as a bonus — gives us
clean per-selection success/failure data for the UI.

## How the UI handles missing access

`getTornUserData()` / `getTornPublicData()` return
`{ data: TornUserData, access: TornAccessEntry[] }`. Each `TornAccessEntry`
has a `status` of `"ok" | "denied" | "unavailable" | "error"`. The
`<ApiAccessNotice access={...} />` component (rendered on `/` and
`/dashboard`) reads this list and shows a clear "some data requires
additional API access" panel naming exactly which features are degraded —
distinct from a hard "can't reach the Torn API" failure. **A key that's valid
but underprivileged is never reported as invalid.**

## Recommended minimum key for this dashboard

To power every module currently planned (Priorities, Cooldowns, Net Worth,
Character Overview, Consumables/Snapshots, Gear, Racing, Bank Planner,
Properties), generate a **custom API key with at least these selections**
(Torn → Settings → API Keys → Create Custom Key):

- `basic`, `profile`, `properties` — already covered by the current Public Only key
- `stats`, `travel`, `networth`, `inventory`, `weapons`, `armor`, `crimes`, `chain`, `cooldowns`, `enlistedcars` — all currently blocked with `code 16: "Access level of this key is not high enough"`. Torn's error response doesn't break this down further per selection, so we can't yet say whether Minimal or Limited Access unlocks some of these — only that Public Only unlocks none of them. Generate a higher-tier custom key and re-run `npm run verify:torn-api` to see exactly which ones open up at each level.

If Torn's custom key UI doesn't allow this granular a selection, the
practical recommendation is a **Full Access** key — it's the only level
guaranteed to expose everything above. Treat it as sensitive: keep it in
`.env.local` (gitignored), never commit it, and rotate it if it's ever exposed.

## Current key status (as of this writing)

The key currently configured in `.env.local` is **Public Only / access level
1**. It successfully authenticates as the player "Shenzy" but cannot expose
the financial, inventory, combat, or cooldown data this dashboard needs. The
dashboard runs and renders gracefully with this key — it shows the "requires
additional API access" notice and keeps the affected cards in their
placeholder/empty states until a higher-access key is supplied.
