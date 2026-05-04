# Fractional-Page Memorization Workload — Design

**Status:** Draft
**Date:** 2026-05-04
**Author:** Brainstorm with Claude

## Problem

The current "lines per session" preset (e.g., 6 lines = 0.4 page) does not divide a 15-line page evenly, so a student set to 6 lines/day finishes a page in roughly 2.5 sessions. Students think in terms of "I want to finish a page every N days," not lines per day.

The user wants the daily memorization amount expressed as a **fraction of a page** (1/8, 1/6, 1/5, 1/4, 1/3, 1/2, 1, 1.5, 2, 3) so a page completes in a clean integer number of sessions, and the algorithm should self-correct drift so that "1/3 page/day" really does finish a page every 3 sessions on average.

## Goals

1. Replace the lines-per-session preset list with fraction-of-a-page presets.
2. Make the new-memorization walker self-correct cumulative drift, so the user's chosen pace holds over many sessions.
3. Keep verses atomic — never split a verse to hit a page-line boundary.
4. Preserve existing walker behavior for surah alignment (10% stop rule, 110% extension).

## Non-goals

- No change to minor revision, major revision, or wrap-around logic.
- No new persistent state on `StudentConfig` beyond the renamed field.
- No sub-verse granularity in `verseData.ts`.
- No UI changes outside the memorization-amount preset.

## Design

### 1. UI / Configuration

**Field rename on `StudentConfig`:** `linesPerSession: number` → `pagesPerSession: number` (a fraction of a page).

**New presets** in `MemorizationSettings.tsx`:

| Label (Arabic) | Value | Page completion cadence |
|---|---|---|
| ثُمن صفحة | 0.125 | 8 days/page |
| سُدس صفحة | 0.1667 | 6 days/page |
| خُمس صفحة | 0.2 | 5 days/page |
| رُبع صفحة | 0.25 | 4 days/page |
| ثُلث صفحة | 0.3333 | 3 days/page |
| نصف صفحة | 0.5 | 2 days/page |
| صفحة كاملة | 1.0 | 1 day/page |
| صفحة ونصف | 1.5 | 2/3 day/page |
| صفحتان | 2.0 | 0.5 day/page |
| ٣ صفحات | 3.0 | 1/3 day/page |

**localStorage migration** in `usePlanStore.ts` rehydration: if a persisted student has `linesPerSession`, set `pagesPerSession = linesPerSession / 15` and delete the old key. Old `7 → 0.467` does not exactly equal the new `0.5` preset; this is acceptable — the next time the user opens settings, the dropdown will pick the closest preset, and the value continues to work in the algorithm regardless of whether it matches a preset.

### 2. Algorithm — Cumulative-Budget Snap

Change is confined to `newMemorization.ts`. `walkByWeight`, `weightBetween`, `helpers.ts`, and other algorithm files are unchanged.

The key insight: instead of recomputing "last memorized verse" from `cursor` (which is fragile because cursor semantics differ between mid-plan and end-of-Quran cases), we accept the previously memorized weight as a parameter. `planGenerator.ts` already accumulates this naturally as it walks through rows.

**New signature:**

```ts
calculateNewMemorization(
  cursor: QuranPosition,
  pagesPerSession: number,
  direction: Direction,
  cumulativeActual: number,   // pages memorized so far (0 before session 1)
  sessionNumber: number,       // 1-based session index, matches planGenerator's loop var `i`
): NewMemorizationResult | null
```

**Logic:**

```ts
// Pages the student should have memorized by the end of this session:
const cumulativeTarget = sessionNumber * pagesPerSession;

const todaysBudget = cumulativeTarget - cumulativeActual;
if (todaysBudget <= 0) return null;   // already ahead of schedule

const walked = walkByWeight(cursor, todaysBudget, direction);
// rest of the function unchanged: derive from/to/newCursor/range from walked
```

The result already returns `pagesUsed`, so `planGenerator.ts` updates its running total: `cumulativeActual += result?.pagesUsed ?? 0` between rows.

**Why this works:**

- The walker already returns `pagesUsed`, the exact weight consumed by each session. Accumulating it row-by-row is cheaper and more robust than recomputing from positions.
- `cumulativeActual` is loop-local — no new persistent state on `StudentConfig` or in localStorage.
- Today's budget self-corrects yesterday's under/over-shoot.
- The 110% extension rule and 10% surah-stop rule continue to operate on `todaysBudget` — they remain calibrated to whatever the walker is actually trying to fit, so a catch-up session that lands near a surah end still benefits from extension.
- End-of-Quran: when `cursor` is past the last verse, `walkByWeight` returns `pagesUsed: 0` (existing behavior), `cumulativeActual` plateaus, and `planGenerator.ts` treats this as "no new memo for this row" — same as today.

### 3. Caller Update

`planGenerator.ts` adds a `cumulativeActual` accumulator initialized to `0` before the existing 1-based row loop, increments it by `result.pagesUsed` after each row's new-memo result, and passes it into `calculateNewMemorization`:

```ts
let cumulativeActual = 0;
for (let i = 1; i <= ASSIGNMENTS_COUNT; i++) {
  // ...
  const memResult = calculateNewMemorization(
    memCursor,
    config.pagesPerSession,
    config.direction,
    cumulativeActual,
    i,                  // sessionNumber (1-based)
  );
  if (memResult) {
    cumulativeActual += memResult.pagesUsed;
    // ... existing handling: row.memFrom/memTo, memCursor update
  }
  // ... minor + major rev unchanged
}
```

`buildSettingsSummary` also needs updating: the line `المقدار: ${toArabicNumerals(config.linesPerSession)} سطر` should be replaced with a fractional-page label (e.g., `${config.pagesPerSession} صفحة`, ideally with the matching Arabic preset label when one exists).

`linesPerSession` references throughout the codebase are renamed to `pagesPerSession`. Files affected (search hits): `planGenerator.ts`, `newMemorization.ts`, `types.ts`, `usePlanStore.ts`, `MemorizationSettings.tsx`, `SetupClient.tsx`, plus the two test files.

The internal `pageBudget` variable in `newMemorization.ts` is removed (the renamed `pagesPerSession` is now itself a page fraction; no division by `LINES_PER_PAGE`).

## Tests

Add to `planGenerator.test.ts` or a new `newMemorization.test.ts`:

1. **Three-session page completion.** With `pagesPerSession = 1/3`, three consecutive sessions starting from the beginning of a page collectively cover ≥ 0.95 and ≤ 1.05 pages.
2. **Under-shoot self-correction.** After a session that under-shoots the daily target by ≥ 0.03 pages, the next session's effective budget is at least 0.03 pages larger than the daily target.
3. **Over-shoot self-correction.** After a session that over-shoots (via 110% extension), the next session's budget is correspondingly smaller.
4. **End-of-Quran.** When `cursor` is past the last verse, `calculateNewMemorization` returns `null` regardless of cumulative arithmetic.
5. **Day 1 boundary.** When `cumulativeActual = 0` and `sessionNumber = 1`, `todaysBudget = pagesPerSession` (no off-by-one).
6. **Descending direction.** All of the above also pass for `direction === "descending"`.

## Risks

- **Visual.test.ts snapshots** likely include line-count labels — they will need regenerating. Low risk, well-contained.
- **The `cumulativeTarget` formula** assumes one row = one session. This holds today (40-row plan = 40 sessions). If the row model ever changes, this assumption needs revisiting.
- **Migration edge case:** a user with the old `7 lines (نصف صفحة)` preset will have `pagesPerSession = 0.467` after migration, not `0.5`. The algorithm handles arbitrary fractions correctly, but the dropdown won't show a selected preset until the user picks one. Acceptable.
