# Torn API field map

This documents which Torn API selections this dashboard depends on, what
access level each one needs, and known quirks of the Torn API that affect how
we fetch them. The current key (configured in `.env.local`, never committed)
is a **Full Access / access level 4** key authenticating as "Shenzy" — it
unlocks every selection this app currently uses. See "Current key status"
below.

To re-test this yourself (without ever printing the key), run:

```
npm run verify:torn-api
```

This regenerates [`docs/API_VERIFICATION_RESULTS.md`](docs/API_VERIFICATION_RESULTS.md)
with a fresh per-selection pass/fail table, error codes, messages, and the
top-level fields returned on success. Re-run it whenever you swap in a new
key — the summary below was last refreshed from a live Full Access run on
2026-06-08.

Torn API key access levels (from lowest to highest):

| Level | Name            | Notes                                                |
|-------|-----------------|------------------------------------------------------|
| 1     | Public Only     | Safest/default level. Exposes only public profile data. |
| 2     | Minimal Access  | Adds some personal, non-sensitive data.             |
| 3     | Limited Access  | Adds more personal data (varies by selection).      |
| 4     | Full Access     | Exposes nearly everything, including sensitive financial/inventory data. |

## Selection name corrections (legacy v1 names → current names)

The original draft of this map (and the original `torn.ts` selection lists)
guessed at selection names that turned out to be **stale or wrong** —
independent of access level. Testing against a Full Access key exposed this
clearly, because a Full Access key should unlock everything, yet several
selections still failed. The cause was selection-name drift, not access:

| Old (assumed) name | Result        | Correct current name           | Notes |
|--------------------|---------------|--------------------------------|-------|
| `stats`            | `code 16`     | `battlestats`                  | Returns flat numeric fields (`strength, defense, speed, dexterity, total`) — not the `{current, maximum}` shape we'd guessed. |
| `weapons` / `armor`| `code 16`     | `equipment`                    | One selection now returns a flat array of all equipped + owned gear (`{ID, UID, name, type, equipped, market_price, quantity}`), not slot-keyed objects. |
| `garage`           | `code 4`/`16` | `enlistedcars` (v2 API only)   | The legacy `/user/?selections=enlistedcars` (v1) returns `code 23: "This selection is only available in API v2"`. It must be fetched from `https://api.torn.com/v2/user/enlistedcars` — different base path, no combination with other selections, and a different response envelope. |
| `chain`            | `code 16`     | *(not applicable to `/user/`)* | `chain` is a **faction-level** selection (`/faction/?selections=chain`), not a user one — it returns `code 16` for *any* personal key, including Full Access, because a personal key simply isn't the right credential for it. We removed it from this app's data model rather than chase it further. |
| `crimes`           | returns `criminalrecord` | `crimes` (name is fine) | The selection name `crimes` is correct, but the JSON it returns is keyed `criminalrecord` (a lifetime totals breakdown by category), not a list of active/cooldown crimes as originally assumed. `mapAdminSummary` now reads `data.criminalrecord` into `AdminSummary.criminalRecord`. |

**Lesson learned**: a `code 16` ("access level too low") result does not
always mean "get a higher-tier key" — it can also mean "this selection name
no longer exists for `/user/`," which a higher-tier key will never fix. The
only way to be sure is to test against a Full Access key: if it still fails,
the selection name (or endpoint) is wrong, not the access level.

## Selection → status (Full Access key)

Tested individually via `npm run verify:torn-api` — full raw output in
[`docs/API_VERIFICATION_RESULTS.md`](docs/API_VERIFICATION_RESULTS.md):

| Selection         | Used for                          | Result    | Top-level fields / shape returned |
|-------------------|-----------------------------------|-----------|------------------------------------|
| `basic`           | Name, level, rank, image          | ✅ success | `level, gender, player_id, name, status` |
| `profile`         | Vitals, points, merits, faction   | ✅ success | `life, energy, nerve, happy, points, merits, faction, job, status, ...` (28 fields) |
| `battlestats`     | Battle stats total (Overview card)| ✅ success | `strength, speed, dexterity, defense, total, *_modifier, *_info` |
| `travel`          | Travel status                     | ✅ success | status/destination fields |
| `networth`        | Net Worth card                    | ✅ success | `cash, bank, stock, items, property, total, points` |
| `inventory`       | Watchlist, consumable usage, snapshots | ✅ success | `total_items, items` |
| `properties`      | Properties module                 | ✅ success | `properties` |
| `equipment`       | Gear module (future)              | ✅ success | flat array of `{ID, UID, name, type, equipped, market_price, quantity}` |
| `crimes`          | Criminal record (future)          | ✅ success | `criminalrecord: {vandalism, theft, counterfeiting, fraud, ...total}` |
| `cooldowns`       | Cooldowns card                    | ✅ success | `{drug, medical, booster}` (seconds remaining) |
| `enlistedcars` (v2) | Racing/garage module (future)   | ✅ success | array of `{id, car_item_name, top_speed, acceleration, class, worth, races_entered, races_won, ...}` |

All 11 selections succeed with the current Full Access key — there is
currently **no degraded module** in normal operation. `<ApiAccessNotice>`
will simply render nothing (returns `null`) until/unless a selection starts
failing again (e.g. if the key is swapped for a lower-tier one, or Torn
changes a selection name again).

## Important API quirks (still relevant, now corrected for)

- **Selection-combination conflicts**: the legacy `/user/?selections=` endpoint
  rejects certain combinations outright with `code 4: "Wrong fields"`,
  independent of access level (e.g. the old `stats`+`profile` pairing). We
  sidestep this entirely by fetching every selection in its own request
  (parallelized via `Promise.all`, cached 90–120s) and merging results in
  `fetchTornMerged()` — see `src/lib/torn.ts`.
- **`enlistedcars` requires the v2 API**: it's fetched separately via
  `fetchEnlistedCarsV2()`, which calls `https://api.torn.com/v2/user/enlistedcars`
  (a different base path and response envelope than the v1 `/user/` calls).
- **`items` is a lookup-style selection** (expects an `id` parameter) and
  isn't meaningful as a plain `/user/` selection — not used by this app.
- **Some selections return flat, unwrapped data**: most selections nest their
  payload under a key matching the selection name (`travel` → `{ travel: {...} }`,
  `cooldowns` → `{ cooldowns: {...} }`). But `basic`, `profile`, `battlestats`,
  and `money` instead merge their fields directly into the top level of the
  response with **no** wrapper key — and `crimes` nests under a *different*
  name (`criminalrecord`) than the selection itself. This was a real,
  pre-existing bug: `mapCharacterOverview` was reading `data.basic?.name` /
  `data.profile?.points` / `data.battlestats?.total`, all of which were
  silently `undefined` because the actual fields lived at the top level —
  the dashboard always showed "Your Dashboard" / all-zero stats, masked by
  the fact that the Public Only key never had a chance to prove otherwise.
  `fetchTornSelection()` now re-wraps the known-flat selections
  (`FLAT_SELECTIONS` in `src/lib/torn.ts`) under their selection-name key so
  `TornUserData.basic` / `.profile` / `.battlestats` / `.money` are always
  populated consistently — and `rank`/`points`/`merits` are now read from
  their *correct* sources (`profile.rank`, `money.points`, summed `merits`
  category allocations) instead of the wrong ones the original code guessed.
  The same `basic.rank` mistake existed in **both** `mapCharacterOverview`
  *and* `mapPublicSummary` — both now read `profile.rank`, and the bogus
  `rank` field has been removed from the `TornBasic` type entirely (the
  `basic` selection has never returned it).
- **`energy`/`nerve`/`happy` live in `bars`, not `profile`**: another
  pre-existing bug in the same family — `mapCharacterOverview` read
  `profile.energy` / `profile.nerve` / `profile.happy`, but `profile` only
  ever contains `life` (also `{current, maximum}`-shaped). The other three
  vitals come from the separate `bars` selection, which returns `energy`,
  `nerve`, `happy`, `life`, `chain`, and `server_time` flat at the top level
  (added to `FLAT_SELECTIONS`). This silently zeroed out energy/happy/nerve
  on the dashboard and in the new Jump Planner until corrected — confirmed
  live: `bars` reports real values like `happy: 4973/5025`, `energy: 10/150`.
  Bonus: `bars.chain` also exposes the player's personal chain participation
  (`{current, maximum, timeout, modifier, cooldown}`) — a different, accessible
  shape than the faction-scoped `chain` *selection* documented above.

## How the UI handles missing access

`getTornUserData()` / `getTornPublicData()` return
`{ data: TornUserData, access: TornAccessEntry[] }`. Each `TornAccessEntry`
has a `status` of `"ok" | "denied" | "unavailable" | "error"`. The
`<ApiAccessNotice access={...} />` component (rendered on `/` and
`/dashboard`) reads this list and shows a clear "some data requires
additional API access" panel naming exactly which features are degraded —
distinct from a hard "can't reach the Torn API" failure, and it never reports
a valid-but-underprivileged key as invalid. With the current Full Access key
it renders nothing, but it will activate automatically again if access ever
narrows.

## Recommended minimum key for this dashboard

Every selection this dashboard currently uses (`basic`, `profile`,
`battlestats`, `travel`, `networth`, `inventory`, `properties`, `equipment`,
`crimes`, `cooldowns`, plus `enlistedcars` via v2) succeeds with the current
**Full Access** key. We can't conclusively say from a single key test which
of these would also work at Minimal or Limited Access — Torn's `code 16`
response doesn't break down per-selection requirements, and several of the
selection-name corrections above only became visible *because* we had Full
Access (a lower-tier key would have returned the same `code 16` for the
wrong-name selections, masking the naming bug entirely).

**Practical recommendation: keep using a Full Access key.** It's the only
tier we've confirmed unlocks everything, and re-deriving a minimal selection
set would require trial-and-error against multiple key tiers — fragile and
likely to break again the next time Torn renames a selection. Treat the key
as sensitive: keep it in `.env.local` (gitignored), never commit it, and
rotate it if it's ever exposed.

## Current key status (as of this writing)

The key configured in `.env.local` is **Full Access / access level 4**,
authenticating as the player "Shenzy". All 11 selections this dashboard
depends on succeed. The previous key on file was Public Only (level 1) and
exposed only `basic`/`profile`/`properties` — that key has been replaced.
