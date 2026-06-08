# Project status — 2026-06-08

## Where things stand

The dashboard runs on a **Full Access Torn API key** (configured in
`.env.local`, never committed) authenticating as "Shenzy". Tagged milestone:
`v0.3-real-data-foundation` (commit `67cc423`).

We're now executing the user's strategic roadmap for Ron's Torn Command
Center, in priority order:

1. **Snapshot Engine** — complete
2. **War Readiness Countdown** ← just completed (this entry)
3. Gear Advisor
4. Garage/Racing
5. Property Management
6. Public Share Pages
7. Multi-user support

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

## Commits this session
- `67cc423` — Fix flat-vs-nested response shapes and rank/points/merits field sources (tagged `v0.3-real-data-foundation`)
- `2a8ff50` — Build Happy Jump Planner, live Consumables status, and richer advisor recs
- `4d9585d` — Add PROJECT_STATUS.md summarizing session progress and next steps
- `7cd9e19` — Phase 1: Snapshot Engine — extended payload, comparison utilities, history viewer
- *(this commit)* — Phase 2: War Readiness Countdown — time-aware readiness score, dual-time (TCT/local) display, Vicodin timing guidance, manual war-time settings, advisor integration

## Next unfinished tasks

Per the roadmap, **Phase 3 — Gear Advisor** is next: using the live
`equipment` data already fetched via `summary.equipment`, feed
recommendations into `advisor.ts` (e.g. flagging unequipped/suboptimal gear
for the character's current activity). Awaiting user go-ahead before
starting, consistent with the "stop and report after each phase" pattern.

Standing notes (unchanged):
- Pre-existing duplicate `page 2.tsx` files remain untracked in
  `bank-stocks/`, `garage/`, `gear/`, `jump-planner/` — Finder/iCloud sync
  artifacts, not created by any session work; deliberately left alone.
- No deployment has occurred. Everything is local-only, per standing
  instructions ("Do not deploy").
