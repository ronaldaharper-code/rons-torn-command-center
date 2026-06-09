# Project status — 2026-06-08

## Where things stand

The dashboard runs on a **Full Access Torn API key** (configured in
`.env.local`, never committed) authenticating as "Shenzy". Tagged milestone:
`v0.3-real-data-foundation` (commit `67cc423`).

We're now executing the user's strategic roadmap for Ron's Torn Command
Center, in priority order:

1. **Snapshot Engine** — complete
2. **War Readiness Countdown** — complete
3. **Gear Advisor** — complete
4. **Garage/Racing** — complete
5. **Property Management** — complete
6. **Happy Jump Planner revision** ← just completed (this entry)
7. Public Share Pages
8. Multi-user support

Guiding product principle: **this is a Torn decision engine, not a Torn
dashboard** — every feature should answer "what should Shenzy do next?"

## Phase 1 — Snapshot Engine (complete)

Goal: capture periodic state history as the foundation for trends,
forecasting, and advisor intelligence (net worth trajectory, stat growth,
inventory burn rate, war readiness forecasting, jump effectiveness, etc).

What changed:

1. **Audited the existing `Snapshot` Prisma model** — confirmed the generic
   `{ id, ownerKey, type, data: JSON string, createdAt }` shape is sufficient
   as-is. **No schema migration was needed**; we only extended the
   TypeScript `SnapshotPayload` shape (`src/lib/torn-types.ts`).

2. **Extended `SnapshotPayload`** to capture the full required field set:
   net worth, cash, bank, stock, property value, item value, points, merits,
   battle stats (total + breakdown), energy/happy/nerve/life bars, status
   (doubles as "travel status" — hospital/jail/traveling/okay), cooldowns
   (drug/medical/booster), and watched inventory quantities. New fields are
   **optional** so previously-stored snapshot rows keep parsing correctly —
   readers treat their absence as "not captured at this snapshot," not zero.
   Added `SnapshotBattleStats` / `SnapshotCooldowns` supporting types.

3. **Wired the new data sources through**: `mapAdminSummary` now also
   surfaces `battlestats` (`src/lib/torn.ts`), and
   `buildSnapshotPayload` (`src/lib/snapshot.ts`) populates every new
   `SnapshotPayload` field from the live `AdminSummary`/`cooldowns` data.

4. **Verified the existing capture action needs no changes**:
   `CaptureSnapshotButton` → `POST /api/snapshot` → `captureSnapshot()` →
   `buildSnapshotPayload()` already wired correctly; the route now
   transparently captures the richer payload with zero route/button changes.

5. **Built comparison utilities** (`compareSnapshots`, `compareAgainstWindow`
   in `src/lib/snapshot.ts`) — pure, UI-independent diffing helpers that
   compute metric-by-metric deltas (net worth, cash, battle stats total,
   points, merits) between two snapshots, or between the latest snapshot and
   the oldest one inside a time window (default 7 days). Metrics missing from
   either side are skipped rather than reported as a misleading "drop to 0".
   These are intentionally decoupled from the UI so the same logic can power
   the history viewer, future forecasting, and `advisor.ts` trend rules
   alike.

6. **Built the snapshot history viewer** — new
   `src/components/SnapshotHistoryPanel.tsx`, surfaced on `/settings`
   (alongside `ConsumableUsagePanel`, where related historical tooling
   already lives). Shows:
   - A **weekly trend card** (powered by `compareAgainstWindow`) with
     before → after values, absolute change, and percent change per metric,
     color-coded green/red for up/down.
   - A **recent captures table** (timestamp, net worth, cash, battle stats,
     points, merits, status) for the last 20 snapshots.
   - Graceful empty states for "no snapshots yet" and "not enough history for
     a trend yet".

7. **Lint/build**: clean — same 8 pre-existing issues as before (4 errors, 4
   warnings, all in code untouched by this phase: `torn-types.ts` `any`
   fields on `items`/`properties`/`news`, `torn.ts` `buildInventoryMap`
   `any`, plus pre-existing unused-var/`<img>` warnings elsewhere). No new
   issues introduced.

No background scheduling and no deployment were added, per the explicit
Phase 1 scope ("no background scheduling yet; no deployment yet").

## Phase 2 — War Readiness Countdown (complete)

Goal: answer one question with a **time-aware** plan — "Will Shenzy be ready
when ranked war starts?" — not a generic war checklist.

**API investigation findings (recorded before any architecture changes):**

- Ranked war timing **is** exposed by Torn's API: `v2/faction/wars` returns
  `{ pacts, wars: { ranked, raids, territory } }`. For Howler's Haven,
  `ranked` is currently `null` (no scheduled war), so the populated shape
  couldn't be observed live. We built a defensive parser
  (`extractRankedWarWindow`) that checks multiple plausible nestings
  (`ranked.war?.start` / `ranked?.start`) and returns `undefined` rather than
  guessing — falling back gracefully to a manual per-owner Settings value.
- **Torn City Time (TCT) = UTC** — confirmed via `v2/user?selections=timestamp`
  returning a plain Unix timestamp with no separate offset/timezone field.
  This means dual-time display only needs one real conversion: UTC → the
  user's IANA local zone via `Intl.DateTimeFormat` (DST-safe, never a
  hardcoded "EST").
- `profile.faction.faction_id` provides the faction ID dynamically — no
  hardcoding of "Howler's Haven" or any faction name/ID needed.
- `profile.states.{hospital_timestamp, jail_timestamp}` expose **exact
  release timestamps** (0 = not applicable) — the only place exact
  resolve-times are available, used to compute precise blocking-issue
  countdowns instead of guesses.
- A throwaway probe script (`scripts/probe-war-data.mjs`) was used to confirm
  these shapes against the live API and then **deleted** once findings were
  extracted (kept the repo clean — not wired into npm scripts).

**What was built:**

1. **`src/lib/time.ts`** (new) — `formatDualTime()` renders any instant as
   both `"HH:MM TCT"` and local time with the correct zone abbreviation
   (e.g. `"7:00 PM EDT"`), resolved per-instant by `Intl` so DST transitions
   are automatic. Also `formatDuration()` (`"1d 4h 12m"` style) and
   `isValidTimeZone()` for validating IANA zone names. `DEFAULT_LOCAL_TIME_ZONE
   = "America/Detroit"`.

2. **`src/lib/settings.ts`** (new) — generic per-owner settings service. The
   `Setting` Prisma model (`{ ownerKey, key, value }`, unique on
   `[ownerKey, key]`) already existed but was **completely unused** — wired it
   up directly with zero schema migration. Exposes
   `getWarReadinessSettings()` / `setWarReadinessSetting()` for
   `preferredTimeZone`, `manualRankedWarStart` (ISO 8601), and
   `vicodinCooldownAssumptionMinutes` (default 360 — the API doesn't expose
   drug-cooldown duration directly, so this is a configurable, conservative,
   clearly-labeled assumption).

3. **`src/lib/warReadiness.ts`** (new, pure planning module, mirrors
   `jumpPlanner.ts`'s `buildJumpPlan()` pattern) — `buildWarReadinessPlan()`
   computes everything from one input bundle (character, cooldowns, inventory,
   war time, settings) so the dashboard card and the advisor never disagree:
   - **Readiness score** (0–100): starts at 100, subtracts capped penalties
     for status (hospital/jail/traveling), low life/energy ratios, missing
     blood bags/Xanax/Vicodin.
   - **`readyNow`**: requires `okay` status, no critical blocker, life ≥ 50%.
   - **`readyByWarStart: boolean | "unknown"`** — deliberately three-valued:
     returns `"unknown"` whenever the war time isn't set, or any blocking
     issue lacks a resolvable `resolvesAt` (e.g. traveling with no ETA,
     hospital/jail timestamp = 0). This directly encodes "be conservative —
     if uncertain, warn rather than overpromise" rather than assuming things
     resolve in time.
   - **Vicodin timing guidance** — a state machine over (Vicodin count, war
     time known?, current medical-cooldown state, projected clear-time vs. war
     start) producing verdicts (`take-now`, `wait-for-cooldown`,
     `hold-until-closer`, `save-for-war-start`, `no-vicodin`, `unknown`) with
     headline/detail text matching the spec's example phrasings ("War starts
     in 4h. You can take Vicodin now and cooldown should clear before war.",
     "Do not take Vicodin now.", "Save Vicodin for war start.", etc.), always
     labeling the cooldown-length assumption.
   - Surfaces blocking issues (severity-ranked) and recommended actions for
     the UI and advisor to share verbatim.

4. **`src/components/WarReadinessCard.tsx`** (new) — dashboard card showing
   readiness score, Ready Now / Ready By War Start (Yes / No / Uncertain) /
   Time Until War / War Start (TCT **and** local time, with source label:
   API vs. manual vs. none), blocking issues (severity-colored), recommended
   actions, and a dedicated Vicodin-timing panel. Placed between Priorities
   and Cooldowns on `/dashboard`.

5. **`src/app/api/settings/war-readiness/route.ts`** +
   **`src/components/WarReadinessSettingsForm.tsx`** (new) — `/settings` now
   has a "War readiness settings" panel with three independent forms: IANA
   time zone (with one-click suggestions including `America/Detroit`,
   validated client- and server-side), manual ranked war start time
   (`datetime-local` input, ISO 8601 round-trip, only used when Torn reports
   no scheduled war), and the Vicodin cooldown-assumption minutes. All persist
   per-`ownerKey` via the new settings service.

6. **Extended `torn-types.ts` / `torn.ts`**: `TornProfile.states` (hospital/
   jail timestamps), `TornProfile.faction` (dynamic faction ID),
   `CharacterOverview.{hospitalUntil, jailUntil, factionId}`,
   `RankedWarWindow` / `FactionWarStatus` types, `extractRankedWarWindow()`,
   and `getFactionWarStatus()` (cached 300s under `"torn:faction:wars"`).

7. **`advisor.ts`**: replaced the no-op `warReadinessRecommendations()` stub
   with a full implementation — nudges to set a war start time when none is
   known; otherwise a score-scaled countdown headline, critical/high blocking
   issues (medium-severity skipped to avoid noise), all recommended actions,
   and Vicodin guidance (skipping non-actionable `no-vicodin`/`unknown`
   verdicts). `AdvisorInput.warReadiness` is now strongly typed as
   `WarReadinessPlan` (was `unknown`).

8. **Wired into `/dashboard`** (`getFactionWarStatus` → manual-setting
   fallback → `buildWarReadinessPlan` → `<WarReadinessCard>` +
   `buildRecommendations({ warReadiness })`) and **`/settings`**
   (`<WarReadinessSettingsForm>`).

9. **Live verification** (dev server, authenticated via the existing
   `ron_dashboard_auth` cookie — no secrets read or printed): confirmed the
   "War Readiness Countdown" card renders on `/dashboard`, correctly shows
   "Set a ranked war start time to unlock the countdown" (no API war
   scheduled, no manual time set), and correctly shows "No Vicodin on hand"
   guidance (Shenzy currently has 0 Vicodin in inventory). Score read as
   `55/100` given current life/blood-bag/Xanax/Vicodin state.

10. **Lint/build**: clean — same 8 pre-existing issues as before (none new).
    One lint warning was introduced and fixed mid-phase: an unused
    `eslint-disable-next-line no-new` directive in `time.ts`'s
    `isValidTimeZone`, resolved by wrapping the `new Intl.DateTimeFormat(...)`
    construction in `Boolean(...)` so it's an expression rather than a bare
    `new` statement.

No deployment occurred, per explicit instruction ("Do not deploy").

## Phase 3 — Gear Advisor (complete)

Goal: answer "Is Shenzy equipped properly for training, defending, and ranked
war?" — not just display a gear list.

**API investigation findings (recorded before building UI):**

- `selections=equipment` (already in the live bundle) returns a flat list with
  the **canonical slot category** in `type` — `Primary`/`Secondary`/`Melee`/
  `Defensive`/`Temporary`/`Enhancer`/`Clothing` — plus `name`, `market_price`,
  `quantity`, and a `UID` we can join on. It does **not** expose stats or
  bonuses.
- `v2/user/equipment` (fetched separately, new `getEquipmentDetails()`) is far
  richer: `sub_type` (e.g. "Rifle"), `stats: {damage, accuracy, armor,
  quality}`, named `bonuses: [{title, description, value}]`, `rarity`, `slot`,
  `ammo`, `mods`. The two responses share the same `uid`/`UID`, so the Gear
  Advisor joins them rather than guessing slot-number meanings from either
  side alone — using the API's own categorical labels (per the brief: "do not
  hardcode these assumptions if API data says otherwise").
- **Confirmed Shenzy's personal context directly from live data — not
  hardcoded**: Tavor TAR-21 (Primary) carries the **Deadeye** bonus ("28%
  increased critical hit damage"); Riot Body (Defensive) carries
  **Impregnable** ("23% decreased incoming melee damage"). Both match the
  brief's stated assumptions and were read straight from the API, so nothing
  needed to be assumed or invented.
- `stats.quality` is the one numeric axis the API exposes across **both**
  weapons and armor (Tavor 124.37 vs. Diamond Knife 22.71 vs. Combat Pants
  28.95) — the only defensible single metric for a cross-category
  strongest/weakest comparison without inventing a combined "power score".
- Clothing/Enhancer items expose no stats or bonuses via either endpoint.
- There is **no API-exposed benchmark** for "ideal gear at a given battle-stat
  level" — so the battle-stats comparison stays informational/relative to
  Shenzy's own loadout (956,395 total), with that limitation stated plainly
  rather than inventing a score.

**What was built:**

1. **Extended `torn-types.ts`/`torn.ts`**: `TornEquipmentBonus`,
   `TornEquipmentStats`, `TornEquipmentDetail`, `EquipmentDetails` types, and
   `getEquipmentDetails()` (cached 300s under
   `"torn:user:equipment-details"`, mirrors `getFactionWarStatus()`'s
   defensive-fetch pattern — returns `{}` rather than throwing on API error).

2. **`src/lib/gearAdvisor.ts`** (new, pure planning module, mirrors
   `warReadiness.ts`/`jumpPlanner.ts`) — `buildGearAdvisorPlan()`:
   - Joins the v1 list (canonical slot category) with the v2 detail feed (by
     `uid`) into `GearPiece` records; `detailAvailable: false` is tracked
     per-item so the UI shows **"bonus/quality detail unavailable from API"**
     rather than rendering an empty bonus list as "no bonus" when the join
     simply didn't happen — directly implementing "if gear bonuses are not
     exposed, show 'bonus unavailable from API' instead of inventing".
   - Groups the loadout into primary/secondary/melee/temporary/armor/other
     and flags **missing slots** — only for the unambiguous "equipped or not"
     categories (a single empty Primary/Secondary/Melee/Temporary slot, or
     zero Defensive-type items at all). Deliberately does **not** assert a
     fixed expected armor-piece count, since that would be hardcoding an
     assumption the API doesn't state.
   - Picks **strongest/weakest** by `stats.quality` (the one cross-category
     metric available) and flags pieces whose quality sits below 60% of the
     loadout's own average as **"review recommended"** — never "replace",
     per the brief's conservative-logic requirement ("if the app cannot prove
     a gear item is weak, phrase it as 'review recommended'").
   - Surfaces a `battleStatsNote` that states plainly there's no API-exposed
     benchmark for "ideal gear at this stat level" — comparison is relative
     to Shenzy's own gear, not an invented external standard.

3. **`src/components/GearAdvisorCard.tsx`** (new) — full loadout view:
   headline/summary, battle-stats context note, a banner when bonus data is
   unavailable, quick primary/secondary/melee/temporary slot summary, missing
   slots, strongest/weakest highlights, review-recommended list, then full
   weapon/armor/clothing tiles showing name, category/sub-type, rarity,
   market value, stats, and named bonuses (or the "unavailable from API"
   fallback). Surfaced at **`/dashboard/gear`** (replacing its prior
   `ComingSoonPage` placeholder).

4. **`src/components/GearAdvisorSummaryCard.tsx`** (new) — compact dashboard
   summary (headline, missing-slot count, strongest piece, review-recommended
   count, link to the full page), added to `/dashboard` right after the War
   Readiness card.

5. **Fed into War Readiness** (`warReadiness.ts`): added an optional
   `gearSummary: { hasWeapon, hasArmor, missingCoreSlotLabels }` input —
   computed once from the Gear Advisor plan and passed in, so the two
   advisors can never disagree about what's equipped. A fully-empty weapon
   loadout or zero armor now contributes a capped score penalty, a blocking
   issue (`resolvesAt: undefined`, deliberately pushing `readyByWarStart`
   toward `"unknown"` rather than assuming the player will gear up in time —
   "warn rather than overpromise"), and a recommended action pointing at the
   Gear Advisor. For Shenzy's current loadout (everything filled), this
   contributes nothing — confirmed live.

6. **`advisor.ts`**: replaced the no-op `gearRecommendations()` stub with a
   full implementation — missing slots (high priority for
   weapon/armor, medium for temporary), a confirmation note when the primary
   slot is filled and acceptable, "review recommended" entries for relatively
   weak pieces (phrased exactly per the brief — "Armor looks underpowered for
   ranked war if this is one of the pieces you'd be relying on"), a note when
   gear data is present but bonus detail isn't, and — when bonus data **is**
   available and named armor bonuses are equipped — "Consider reviewing armor
   bonuses before next ranked war". `AdvisorInput.gearAdvisor` is now
   strongly typed as `GearAdvisorPlan` (was the unused `equipment` stub).

7. **Live verification** (dev server, authenticated via the existing
   `ron_dashboard_auth` cookie — no secrets read or printed): confirmed
   `/dashboard/gear` renders the full loadout — Tavor TAR-21 showing
   **Deadeye**, Riot Body showing **Impregnable**, strongest piece (Glock 17,
   quality 129.7), weakest piece (Diamond Bladed Knife, quality 22.7), and 4
   "review recommended" pieces (Combat Gloves/Pants, Diamond Bladed Knife,
   Riot Body — each below 60% of the loadout's average quality). The
   dashboard summary card renders and links through correctly.

8. **Lint/build**: clean — same 8 pre-existing issues as before (none new).

No deployment occurred, per explicit instruction ("Do not deploy"). A
throwaway probe script (`scripts/probe-gear-data.mjs`) was used to confirm
the live equipment shapes and then deleted once findings were extracted —
same pattern as Phase 2's `probe-war-data.mjs`.

## Phase 4 — Racing Garage Advisor (complete)

Goal: answer "What should Shenzy do next to improve racing performance?" —
a Racing Garage Advisor, not just a garage display.

**API investigation findings (recorded before building UI):**

- `v2/user/enlistedcars` returns each enlisted car's `id` (enlisted ID),
  `car_item_id`, `car_item_name`, `car_name` (custom name — currently `null`
  for all of Shenzy's cars), all 7 racing sub-stats (`top_speed`,
  `acceleration`, `braking`, `handling`, `safety`, `dirt`, `tarmac`), `class`
  (Shenzy currently has Classes E, D, **C**), `worth`, `points_spent`,
  `races_entered`, `races_won`, `is_removed`, and `parts: number[]` — **only
  opaque numeric IDs**, no names or descriptions. Confirmed live, e.g.
  Shenzy's "Chevalier CZ06" — Class C, 65 races / 14 wins, 15 parts
  installed, 77 points spent.
- **Confirmed upgrade/part details are genuinely unavailable from the API at
  this key's access level** — tried two resolution paths and both failed:
  resolving a part ID through the general items catalog (`v2/torn/14/items`)
  returned an unrelated weapon, proving `parts` IDs belong to a separate
  numbering system; and the dedicated catalog endpoints
  (`v1 carupgrades`, `v2 torn/racing/cars`) both returned `{"error": {"code":
  16, "error": "Access level of this key is not high enough"}}`. This is
  exactly the scenario the brief anticipated ("If upgrade details are
  unavailable, do not fake exact upgrade advice") — the entire module is
  built around stating this plainly rather than guessing.
- `races_won` / `races_entered` is the **one outcome metric** the API
  actually reports — used as the sole defensible "best car" signal (win
  rate), instead of inventing a combined performance score from speed/
  handling/etc. A fallback path exists for the case where no car has race
  history (not currently applicable to Shenzy), explicitly labeled as "a
  weaker signal than actual race results".

What changed:

1. **Extended `TornEnlistedCar`** (`src/lib/torn-types.ts`) with
   `car_name`, `points_spent`, `is_removed`, and `parts: number[]` —
   confirmed against live data; the existing stat/class/worth/races fields
   were already present but unconfirmed until now.

2. **Built `garageAdvisor.ts`** (`src/lib/garageAdvisor.ts`, new) — a pure
   planning module mirroring `gearAdvisor.ts`'s `build*Plan()` pattern,
   independent of UI/data-fetching:
   - Filters out removed cars (`is_removed`).
   - Computes win rate per car (`undefined` when `races_entered === 0`,
     never reported as 0%).
   - Picks the **best car by win rate** (tiebreak by races entered), with
     an explicitly-labeled fallback to combined sub-stats only if no car has
     race history yet.
   - Flags **weak areas** via *intra-car* comparison only — a car's lowest
     sub-stat vs. its own average across all 7 stats, flagged only when all
     7 are present and the low stat is below 60% of that average. This
     avoids inventing a class/level benchmark the API doesn't expose, and is
     phrased as "comparatively weaker than the rest of this car's profile,
     not a claim about what's 'good' for its class." Scoped to the best car
     + Class C cars only (Shenzy's stated racing focus), to avoid noise.
   - Surfaces `garageDataAvailable` and `upgradeDataAvailable` (always
     `false` at this key's access level) as first-class flags so the UI and
     advisor never have to guess.

3. **Built `GarageAdvisorCard`** (`src/components/GarageAdvisorCard.tsx`,
   new) — full advisor view: headline/summary, a prominent banner explaining
   *why* upgrade details are unavailable (naming the specific endpoints and
   access-level error) and stating "We won't fabricate exact upgrade
   advice", best-car section, weak-areas section (labeled "review
   recommended"), a dedicated Class C section, and the full garage grid.
   Each car tile shows name, enlisted/car-item ID, class badge, races
   entered/won/win-rate, worth, points spent, all 7 sub-stats when present,
   and an explicit "N parts installed — upgrade details unavailable from
   API" line (never inventing what the parts do).

4. **Built `GarageAdvisorSummaryCard`** (new) — compact dashboard summary
   (headline, cars enlisted / Class C count / best win-rate car name, "View
   garage →" link), wired into `/dashboard` directly under the Gear Advisor
   summary card.

5. **Replaced the `/dashboard/garage` placeholder** (`page.tsx`) with a
   fully wired server component mirroring `gear/page.tsx` — auth check,
   live data fetch, `buildGarageAdvisorPlan()`, renders `GarageAdvisorCard`.

6. **`advisor.ts`**: replaced the no-op `garageRecommendations()` stub with
   a full implementation, matching the brief's example phrasings — "No
   racing data available" when there's nothing enlisted; "Best win-rate car
   appears to be X" from the plan's best car; "Class C car data available —
   review handling upgrades" (or a note that no Class C car is enlisted, if
   that's the case); per-weak-area "review recommended" entries (per the
   conservative-logic clause: "If the app cannot prove the next best
   upgrade, say 'review recommended' rather than giving fake precision");
   and an always-present, plainly-worded note that upgrade details are
   unavailable from the API and that outside guidance (wiki/community)
   should be treated as opinion, not fact — directly applying the new
   "priority order for truth" standing instruction (live API data ranks
   above community/wiki guidance, and strategy-based advice must be clearly
   labeled as such, never presented as fact). `AdvisorInput.garageAdvisor`
   is now strongly typed as `GarageAdvisorPlan`.

7. **Live verification** (dev server, authenticated via the existing
   `ron_dashboard_auth` cookie — no secrets read or printed): confirmed
   `/dashboard/garage` renders the full advisor (headline, best racing car,
   Class C section, "upgrade details unavailable from API" banner and
   per-tile notes) and `/dashboard` shows the new summary card plus
   "Class C car data available — review handling upgrades" / "review
   recommended" / "Best win-rate car appears to be …" recommendations.

8. **Lint/build**: clean — same 8 pre-existing issues as before (4 errors,
   4 warnings, all in code untouched by this phase: `torn-types.ts`/`torn.ts`
   `any` fields, plus pre-existing unused-var/`<img>` warnings elsewhere). No
   new issues introduced.

No deployment occurred, per explicit instruction ("do not deploy"). A
throwaway probe script (`scripts/probe-garage-data.mjs`) was used to confirm
the live `enlistedcars` shape and test part-ID resolution, then deleted once
findings were extracted — same pattern as Phases 2 and 3.

## Phase 5 — Property &amp; Rental Advisor (complete)

Goal: answer "What should Shenzy do next with properties and rentals?" — a
Property / Rental Decision Support tool, not just a property display.

**API investigation findings (recorded before building UI):**

- The v1 `selections=properties` bundle (already in `ADMIN_SELECTIONS_LIST`)
  returns a flat `{ [id]: {...} }` map with `property_type` (numeric),
  `property` (bare name string), and a `rented: { user_id, days_left,
  total_cost, cost_per_day } | null` shape.
- **`v2/user/properties` is dramatically richer** — confirmed live and far
  beyond what the brief assumed might be missing: named `owner`/`property`
  objects, a `status` enum (`in_use`/`rented`/`for_rent`/`none`), `happy`,
  `upkeep: { property, staff }`, `market_price`, `modifications: string[]`,
  `staff: [{type, amount}]`, `used_by`, and — critically — for properties
  Shenzy owns and has rented out: `cost_per_day`, `rental_period`,
  **`rental_period_remaining`** (exact days left, reported live), `rented_by`,
  and `lease_extension: {cost, period, created_at} | null` (non-null once an
  extension offer has been queued). The Property Advisor fetches this v2
  endpoint separately (`getPropertyDetails()`, mirrors `getEquipmentDetails()`)
  rather than reshaping the v1 bundle.
- **This means rental-extension timing can be built on live API data
  directly** — Torn does expose exact days remaining, so Shenzy's stated
  preference (offer at 10 days, urgent under 5) can be applied precisely
  rather than falling back to manual tracking. Confirmed live: Shenzy owns 6
  properties (Private Island, 4 Villas, 1 Trailer); 4 are currently rented
  with 1/14/15/19 days remaining respectively (the 1-day Villa is flagged
  urgent), one Villa is listed `for_rent`, and one Villa already has a
  `lease_extension` offer queued.
- Per the new **"priority order for truth"** standing instruction, manual
  rental reminders (Settings) are built as a genuine *fallback* — they only
  surface as relevant guidance when the live API doesn't expose
  `rental_period_remaining` for a given rental, never as a substitute for
  data the API already provides.

What changed:

1. **Extended `torn-types.ts`** with `TornPropertyV2` (and supporting
   `TornPropertyParty`/`TornPropertyType`/`TornPropertyUpkeep`/
   `TornPropertyStaffEntry`/`TornPropertyLeaseExtension`) and
   `PropertyDetails`, modeling the confirmed-live v2 shape.

2. **Added `getPropertyDetails()`** (`src/lib/torn.ts`) — fetches
   `v2/user/properties` separately (5-minute cache, mirrors
   `getEquipmentDetails()`), returning `{}` gracefully on any API error.

3. **Extended `settings.ts`** with `getPropertyAdvisorSettings()` /
   `setRentalReminderThreshold()` / `setManualRentalReminders()` — stores
   `rentalExtensionReminderDays` (default **10**, per Shenzy's stated
   preference), `urgentRentalReminderDays` (default **5**), and a JSON-encoded
   list of `ManualRentalReminder { id, propertyLabel, rentalEndDate, note? }`
   entries, all in the existing generic `Setting` table — **no schema
   migration needed**, following the same pattern `manualRankedWarStart`
   already established.

4. **Built `propertyAdvisor.ts`** (`src/lib/propertyAdvisor.ts`, new) — a pure
   planning module mirroring `garageAdvisor.ts`/`gearAdvisor.ts`'s
   `build*Plan()` pattern:
   - Identifies properties Shenzy owns directly (`owner.id === characterId`)
     vs. others (e.g. a spouse's properties) — never assumes ownership.
   - For each currently-rented property, only produces a timing alert when
     the API actually reports `rental_period_remaining`; otherwise it's
     surfaced as "renter/end-date details unavailable from API" rather than
     guessed at.
   - Applies Shenzy's thresholds verbatim: **urgent** under 5 days, **offer
     extension now** at ≤10 days, and an **"extension window opens in N
     days"** heads-up within a 5-day lookahead before the threshold — all
     three phrased to match the brief's example wording.
   - Produces parallel **manual reminder alerts** from Settings entries,
     computing days-remaining from a stored end date the same way every
     render (never persisting a stale "days left" snapshot), with the same
     urgent/offer-now/upcoming bands plus an "overdue" band.
   - Exposes `propertyDataAvailable` / `rentalTimingAvailable` flags so the
     UI and advisor never have to guess whether data exists.

5. **Built `PropertyAdvisorCard`** (`src/components/PropertyAdvisorCard.tsx`,
   new) — full advisor view: headline/summary, an amber banner explaining
   *when* renter/end-date detail is unavailable (only shown if it actually
   is, for these properties it currently is available), a live "Rental
   timing" alert list (urgent/offer-now/upcoming, color-coded), a manual
   reminders section, and the full owned-properties grid (status, happy,
   upkeep, staff cost, market value, modification count, renter, rent/day,
   days remaining, extension-offer status).

6. **Built `PropertyAdvisorSummaryCard`** (new) — compact dashboard summary
   (headline, owned count / rented count / "need attention" count, "View
   properties →" link), wired into `/dashboard` directly under the Garage
   Advisor summary card.

7. **Replaced the `/dashboard/properties` placeholder** with a fully wired
   server component mirroring `garage/page.tsx` — auth check, live data +
   settings fetch, `buildPropertyAdvisorPlan()`, renders `PropertyAdvisorCard`.

8. **Built optional Settings UI** — `PropertyAdvisorSettingsForm` (new,
   mirrors `WarReadinessSettingsForm`) lets Shenzy adjust the
   extension/urgent thresholds and add/remove manual rental reminders (label
   + end date + optional note), backed by a new
   `PATCH /api/settings/property-advisor` route. Wired into `/settings`
   directly under the War Readiness settings panel.

9. **`advisor.ts`**: replaced the no-op `propertyRecommendations()` stub with
   a full implementation matching the brief's example phrasings — "Rental
   extension window opens in N days", "Offer extension now — renter has N
   days remaining", "Rental is urgent — under N days remaining", "Property
   data available, but renter/end-date details unavailable from API" (plus
   "Manual rental reminder recommended" when no fallback is set up), and
   per-manual-reminder follow-ups. `AdvisorInput.propertyAdvisor` is now
   strongly typed as `PropertyAdvisorPlan`.

10. **Live verification** (dev server, authenticated via the existing
    `ron_dashboard_auth` cookie — no secrets read or printed): confirmed
    `/dashboard/properties` renders the full advisor with live rental timing
    (correctly flagging the 1-day-remaining Villa as **urgent**), the
    dashboard summary card and "Rental is urgent — under 5 days remaining"
    recommendation appear on `/dashboard`, and the new settings panel renders
    on `/settings`.

11. **Lint/build**: clean — same 8 pre-existing issues as before (4 errors,
    4 warnings, all in code untouched by this phase). No new issues
    introduced.

No deployment occurred, per explicit instruction ("do not deploy"). A
throwaway probe script (`scripts/probe-property-data.mjs`) was used to
confirm the live `v2/user/properties` shape (and check the v1 bundle for
comparison), then deleted once findings were extracted — same pattern as
Phases 2–4.

## Database migration — SQLite → Neon Postgres (complete)

The app previously used a local SQLite file (`prisma/dev.db`) which cannot
persist on Vercel's ephemeral serverless filesystem. Before deploying, the
database was migrated to **Neon Postgres** via the Vercel marketplace
integration.

What changed:

1. **Provisioned Neon database** via `vercel install neon --non-interactive`.
   The Neon integration automatically created a Postgres database, connected
   it to the `rons-torn-command-center` Vercel project, and set all connection
   env vars (`POSTGRES_PRISMA_URL`, `DATABASE_URL_UNPOOLED`, `DATABASE_URL`,
   and ~15 others) for Production, Preview, and Development.

2. **Updated `prisma/schema.prisma`** — changed `provider` from `"sqlite"` to
   `"postgresql"` and adopted Neon's recommended split-URL pattern:
   - `url = env("POSTGRES_PRISMA_URL")` — pooled connection with
     `connect_timeout=15` (prevents cold-start hangs); used by Prisma Client
     at runtime.
   - `directUrl = env("DATABASE_URL_UNPOOLED")` — direct connection without
     pgBouncer; used by `prisma migrate dev/deploy` for schema migrations.

3. **Created initial Postgres migration** — ran `prisma migrate dev --name
   init_postgres`. Generated `prisma/migrations/20260608200522_init_postgres/
   migration.sql` which creates all three tables (`Setting`, `ItemWatch`,
   `Snapshot`) with correct Postgres types (`SERIAL`, `TEXT`, `BOOLEAN`,
   `TIMESTAMP(3)`) and unique indexes. The `prisma/migrations/` directory is
   committed and tracked in git.

4. **Updated `vercel.json`** — `buildCommand` changed from `npm run build` to
   `npx prisma migrate deploy && npm run build`, so schema migrations apply
   automatically on every Vercel deploy before the build runs.

5. **Tested all database write paths against Neon Postgres**:
   - ✅ Settings PATCH (Property Advisor thresholds `12`/`4` saved and read back)
   - ✅ War Readiness Settings PATCH (`preferredTimeZone = America/New_York`)
   - ✅ ItemWatch CREATE → READ → UPDATE → DELETE (Xanax, full CRUD cycle)
   - ✅ Snapshot capture — fetched live Torn data (net worth, battle stats,
     cooldowns) AND persisted to Neon Postgres in one request
   - ✅ Direct DB query confirmed: 3 `Setting` rows and 1 `Snapshot` row
     persisted correctly after tests

6. **Lint/build**: clean — same 8 pre-existing issues (none new). Build
   succeeds against Postgres. All 17 routes compile.

7. **Updated `DEPLOYMENT.md`** — fully rewrote to reflect Neon Postgres setup,
   split-URL pattern, `prisma migrate deploy` build step, sensitive vs. plain
   env var distinction, and local dev workflow.

**Deployed to production on 2026-06-09.**
Production URL: https://rons-torn-command-center.vercel.app

Production verification (all passed):
- ✅ Home page loads (HTTP 200, correct title)
- ✅ Login / dashboard password works
- ✅ Dashboard loads with authenticated content
- ✅ Settings page loads (DB read from Neon Postgres)
- ✅ Snapshot capture (HTTP 201, live Torn data: netWorth 5,776,421,052, energy 100/150, battleStats 961,329)
- ✅ All 17 routes compiled and live

## Commits this session
- `67cc423` — Fix flat-vs-nested response shapes and rank/points/merits field sources (tagged `v0.3-real-data-foundation`)
- `2a8ff50` — Build Happy Jump Planner, live Consumables status, and richer advisor recs
- `4d9585d` — Add PROJECT_STATUS.md summarizing session progress and next steps
- `7cd9e19` — Phase 1: Snapshot Engine — extended payload, comparison utilities, history viewer
- `80779e4` — Phase 2: War Readiness Countdown — time-aware readiness score, dual-time (TCT/local) display, Vicodin timing guidance, manual war-time settings, advisor integration
- `91133a3` — Phase 3: Gear Advisor — live loadout with bonuses/stats/quality, missing-slot and weak-gear detection, war-readiness gear integration, advisor recommendations
- `3c403b7` — Phase 4: Racing Garage Advisor — live garage/race data, win-rate-based best-car ranking, intra-car weak-area detection, "upgrade details unavailable from API" handling, advisor integration
- `ac3225f` — Phase 5: Property & Rental Advisor — live rental-extension timing from `v2/user/properties`, threshold-based offer/urgent guidance, manual reminder fallback, advisor integration
- `785b2eb` — Database migration: SQLite → Neon Postgres, initial migration, Neon split-URL schema pattern, vercel.json build command updated
- `e652102` — Deploy to Vercel production, production verification, docs updated
- *(this commit)* — Phase 6: Happy Jump Planner revision — 7-step workflow, TCT/local cooldown timing, configurable training focus, EDC toggle, advisor integration

## Next unfinished tasks

**Deployed** — production is live at https://rons-torn-command-center.vercel.app.

**Phase 7 — Public Share Pages** is next on the roadmap. Awaiting user go-ahead.

Standing notes (unchanged):
- Pre-existing duplicate `page 2.tsx` files remain untracked in
  `bank-stocks/`, `garage/`, `gear/`, `jump-planner/` — Finder/iCloud sync
  artifacts, not created by any session work; deliberately left alone.
