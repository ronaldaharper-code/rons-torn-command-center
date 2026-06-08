# Torn API field map

This documents which `/user/` selections this dashboard depends on, what
access level each one needs, and known quirks of the Torn API that affect how
we fetch them. The table below replaces an earlier draft that was based on
guesswork — these results come from testing every selection individually
against a real key (currently a **"Public Only" / access level 1** key — see
"Current key status" below).

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

Tested individually with `GET https://api.torn.com/user/?selections=<selection>&key=<key>`:

| Selection      | Used for                  | Result with current key | Likely required level |
|----------------|---------------------------|--------------------------|------------------------|
| `basic`        | Name, level, rank, image  | ✅ OK                    | Public                |
| `profile`      | Energy/nerve/happy/life, points, merits | ✅ OK      | Public                |
| `properties`   | Properties module         | ✅ OK                    | Public                |
| `stats`        | Battle stats total        | ❌ Access level too low  | Minimal/Limited       |
| `travel`       | Travel status             | ❌ Access level too low  | Minimal/Limited       |
| `networth`     | Net worth, cash, bank     | ❌ Access level too low  | Limited/Full          |
| `inventory`    | Watchlist & usage tracking| ❌ Access level too low  | Limited/Full          |
| `weapons`      | Gear module               | ❌ Access level too low  | Limited/Full          |
| `armor`        | Gear module               | ❌ Access level too low  | Limited/Full          |
| `crimes`       | Crime cooldown signal     | ❌ Access level too low  | Limited/Full          |
| `chain`        | Faction chain status      | ❌ Access level too low  | Limited/Full          |
| `cooldowns`    | Cooldowns card            | ❌ Access level too low  | Limited/Full          |
| `enlistedcars` | Racing/garage module      | ❌ Access level too low  | Limited/Full          |

> Exact level boundaries aren't published per-selection by Torn — the table
> above reflects what we observed (`code 16: "Access level of this key is not
> high enough"`) plus general community knowledge that financial/inventory/
> combat data sits behind Minimal–Full Access. Re-run the checks below
> whenever you swap in a new key to get a precise picture:
> `for sel in basic profile stats travel networth inventory properties weapons armor crimes chain cooldowns enlistedcars; do curl -s "https://api.torn.com/user/?selections=$sel&key=YOUR_KEY" | jq '.error // "OK"'; done`

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

- `basic`, `profile`, `properties` — already covered by Public
- `stats`, `travel` — Minimal/Limited Access
- `networth`, `inventory`, `cooldowns`, `crimes`, `chain` — Limited/Full Access
- `weapons`, `armor`, `enlistedcars` — Limited/Full Access (only needed once Gear/Racing modules are built out)

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
