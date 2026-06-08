# Project status — 2026-06-08

## Where things stand

The dashboard now runs on a **Full Access Torn API key** (configured in
`.env.local`, never committed) authenticating as "Shenzy". Tagged milestone:
`v0.3-real-data-foundation` (commit `67cc423`).

Since that tag, this session built out the highest-value features for
**Priorities Today** (per the user's instruction to prioritize those before
Gear/Garage). Latest commit: `2a8ff50` — "Build Happy Jump Planner, live
Consumables status, and richer advisor recs".

## Completed this session

1. **Fixed `formatTimestamp(Date.now())` bug** — it was treating milliseconds
   as Unix seconds and multiplying by 1000 again, producing dates like
   "Jul 20, 58405". Replaced with `formatSyncTime()`, which formats "now"
   directly with no unit conversion to get wrong (`src/lib/torn.ts`).

2. **Discovered & fixed a second flat-selection vitals bug**: `energy`,
   `nerve`, and `happy` do **not** live in the `profile` selection (which
   only carries `life`) — they live in a separate `bars` selection, returned
   flat with no wrapper key (`{energy, nerve, happy, life, chain,
   server_time}`). `mapCharacterOverview` was reading
   `profile.energy`/`.nerve`/`.happy` and always getting `0/0`. Now `bars` is
   fetched, added to `FLAT_SELECTIONS`, and used as the source of truth for
   all four vitals (`src/lib/torn.ts`, `src/lib/torn-types.ts`). Confirmed
   live: happy is genuinely ~99% full (4973/5025), energy ~10% (15/150).
   Bonus: `bars.chain` exposes the player's personal chain participation in
   an accessible shape (distinct from the faction-scoped `chain` *selection*
   documented earlier as inaccessible).

3. **Built the Happy Jump Planner** (`/dashboard/jump-planner`):
   - `src/lib/jumpPlanner.ts` — `buildJumpPlan()`, a pure function shared
     between the planner page and `advisor.ts` so their verdicts never
     disagree. Checks energy, happy, drug cooldown, Xanax/Ecstasy/Candy
     stock (via `inventoryQuantity`), and battle stat distribution; returns
     a `"ready" | "prepare" | "wait"` readiness verdict plus a checklist of
     met/unmet requirements.
   - `src/components/JumpPlannerCard.tsx` — renders the verdict, vitals bars,
     consumable counts, requirement checklist, and a battle-stat distribution
     breakdown (strength/defense/speed/dexterity %).
   - `src/app/dashboard/jump-planner/page.tsx` — replaced the "Coming Soon"
     placeholder with a real server component wired to live data.

4. **Improved Consumables**:
   - `src/components/ConsumablesStatusCard.tsx` — new card on the main
     dashboard showing live on-hand counts vs. each watchlist item's
     `minTarget`, with Stocked / Low / Out badges and a low-stock count
     summary chip. (The existing `ConsumableUsagePanel` on Settings, which
     shows burn-rate estimates from snapshot history, is unchanged and still
     serves its own purpose.)

5. **Upgraded `advisor.ts`**:
   - New `jumpPlannerRecommendations()` shares `buildJumpPlan()` with the
     planner page — surfaces "train now" / "prepare for jump" guidance in
     Priorities Today (silent on "wait" to avoid nagging with nothing
     actionable).
   - `cooldownRecommendations()` now checks actual Xanax stock when the drug
     cooldown is ready/waiting, giving concrete "pop a Xanax now" or "hold
     your N Xanax" guidance instead of generic "a drug item is available".
   - `vitalsRecommendations()` now recognizes the energy+happy combo and
     raises a "prime training window" recommendation (priority `critical`)
     when both are high simultaneously, instead of just flagging energy.

6. **Lint/build**: clean. Lint issues actually dropped from 10 → 8 (replacing
   an `any`-typed `extractStat` helper with a properly-typed `extractBar`
   removed two pre-existing `@typescript-eslint/no-explicit-any` errors).

7. **Docs**: `TORN_API_FIELD_MAP.md` updated with both new quirks (flat
   `basic`/`profile`/`battlestats`/`money`/`bars` shapes, and the
   `energy`/`nerve`/`happy`-live-in-`bars` correction).

## Commits this session
- `67cc423` — Fix flat-vs-nested response shapes and rank/points/merits field sources (tagged `v0.3-real-data-foundation`)
- `2a8ff50` — Build Happy Jump Planner, live Consumables status, and richer advisor recs

## Next unfinished tasks

Per the user's standing instruction: **do not build Gear or Garage yet**
unless the above is complete — it now is, so those are unblocked next:

1. **Gear module** (`/dashboard/gear`) — currently a placeholder. Real
   `equipment` data is already fetched and available via
   `summary.equipment` (`TornEquipmentItem[]`: name, type, equipped slot,
   market value, quantity).
2. **Racing/Garage module** (`/dashboard/garage`) — currently a placeholder.
   Real `enlistedcars` data (v2 API) is already fetched and available via
   `summary.enlistedcars` (`TornEnlistedCar[]`: car stats, races
   entered/won, worth).
3. Wire up the still-stubbed `gearRecommendations()` / `garageRecommendations()`
   in `advisor.ts` (currently no-op stubs) once those modules have real UI to
   link to.
4. Consider surfacing `criminalRecord` (lifetime crime totals) and `merits`
   (currently 38 invested) somewhere in the UI — fetched but not displayed.
5. Pre-existing duplicate `page 2.tsx` files remain untracked in
   `bank-stocks/`, `garage/`, `gear/`, `jump-planner/` — likely Finder/iCloud
   sync artifacts from before any of this work; not created by this session,
   deliberately left alone.

No deployment has occurred. Everything is local-only, per standing
instructions.
