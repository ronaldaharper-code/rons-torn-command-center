# Project status — 2026-06-08

## Where things stand

The dashboard runs on a **Full Access Torn API key** (configured in
`.env.local`, never committed) authenticating as "Shenzy". Tagged milestone:
`v0.3-real-data-foundation` (commit `67cc423`).

We're now executing the user's strategic roadmap for Ron's Torn Command
Center, in priority order:

1. **Snapshot Engine** ← just completed (this entry)
2. War Readiness Countdown
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

## Commits this session
- `67cc423` — Fix flat-vs-nested response shapes and rank/points/merits field sources (tagged `v0.3-real-data-foundation`)
- `2a8ff50` — Build Happy Jump Planner, live Consumables status, and richer advisor recs
- `4d9585d` — Add PROJECT_STATUS.md summarizing session progress and next steps
- *(this commit)* — Phase 1: Snapshot Engine — extended payload, comparison utilities, history viewer

## Next unfinished tasks

Per the roadmap, **Phase 2 — War Readiness Countdown** is next: a
time-aware "will Shenzy be ready when ranked war starts?" feature —
readiness score/countdown/blocking factors/recommended actions, drawing on
energy/life/happy/nerve/cooldowns/travel/hospital/jail status and
Xanax/Vicodin/blood bag stock. Spec calls for being conservative — "if
uncertain, warn rather than overpromise." Ranked war start time should come
from Torn data if available, else a manual per-`ownerKey` setting.

After that: **Phase 3 — Gear Advisor** (using live `equipment` data already
fetched via `summary.equipment`, feeding into `advisor.ts`).

Standing notes (unchanged):
- Pre-existing duplicate `page 2.tsx` files remain untracked in
  `bank-stocks/`, `garage/`, `gear/`, `jump-planner/` — Finder/iCloud sync
  artifacts, not created by any session work; deliberately left alone.
- No deployment has occurred. Everything is local-only, per standing
  instructions ("Do not deploy").
