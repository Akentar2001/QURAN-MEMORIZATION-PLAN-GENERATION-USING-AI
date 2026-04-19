# Verse-Level Refactor Design

**Date:** 2026-04-19  
**Status:** Approved

## Goal

Replace the current page-number arithmetic walker (`advanceByPages`) with a verse-by-verse weight accumulator (`walkByWeight`) that matches the Python `generate_plan_by_amount` reference exactly. All three algorithms — new memorization, minor revision, major revision — become consumers of the same walker. The existing waterfall model in `majorRevision.ts` is preserved; only the measurement engine changes.

## Background

The current `advanceByPages()` maps ayah → page number (integer 1–604) and does page-number arithmetic. This is coarse: a "page" of Al-Baqarah (dense, long ayahs) ≠ a "page" of An-Nas (short ayahs). The Python backend walks verse-by-verse and accumulates `weight_on_page` — a fractional page contribution per verse where all verses on a page sum to exactly 1.0. This refactor brings the TypeScript frontend to full parity.

## Data Layer

### Source Files (at repo root)

- `verses.csv` — 6,236 rows. Columns used:
  - `verse_id` — unique row ID
  - `surah_id` — surah number (1–114)
  - `order_in_surah` — ayah number within surah
  - `order_in_quraan` — absolute integer position (1–6,236). Used for all position comparisons.
  - `reverse_index` — position in reversed sequence (6,236→1). Used for descending walk.
  - `page_no` — Madani mushaf page (1–604)
  - `letters_count` — number of letters in the verse
  - `weight_on_page` — fractional page contribution. Sum over all verses on a page ≈ 1.0.
  - `begin_verse` — first few Arabic words (debug/display only)
- `surahs.csv` — 114 rows. Columns: `surah_id`, `name`, `no_verses`.
- `verse_difficulty.csv` — 6,236 rows. Columns: `verse_id`, `average_difficulty`. **Parked — not used in this refactor.**

### Build-Time Codegen

A Node/TypeScript script (`scripts/generate-verse-data.ts`) reads both CSVs at build time and emits a committed TypeScript file. Zero runtime overhead.

**Output file:** `frontend/src/lib/quran/verseData.ts`

```ts
export interface VerseEntry {
  surahId: number;
  ayah: number;           // order_in_surah
  orderInQuran: number;   // 1–6236
  reverseIndex: number;   // 6236–1
  pageNo: number;
  lettersCount: number;
  weightOnPage: number;
  beginVerse: string;     // debug only
}

export interface SurahEntry {
  id: number;
  name: string;
  ayahCount: number;
}

// Pre-built lookup structures:
export const VERSES: VerseEntry[];           // indexed 0–6235
export const SURAHS: SurahEntry[];           // indexed 0–113
export const BY_POSITION: Record<number, Record<number, VerseEntry>>;  // [surahId][ayah]
export const BY_ORDER: VerseEntry[];         // sorted by orderInQuran (same as VERSES)
export const BY_REVERSE: VerseEntry[];       // sorted by reverseIndex
```

`ayahPages.ts` is deleted after all consumers are migrated.

## Core Engine: `walkByWeight`

**File:** `frontend/src/lib/algorithm/helpers.ts`

```ts
function walkByWeight(
  start: QuranPosition,
  pageBudget: number,
  direction: Direction,
  stopPlace?: number  // surah_id — hard wall, stop before entering
): { from: QuranPosition; to: QuranPosition; pagesUsed: number }
```

### Algorithm (Python parity)

1. Look up `start` in `BY_POSITION`. Begin accumulating `weightOnPage`.
2. Walk verse-by-verse in `direction`:
   - Ascending: follow `orderInQuran` sequence.
   - Descending: follow `reverseIndex` sequence.
3. **Hard stop:** if the next verse's `surahId === stopPlace` → stop immediately, do not enter.
4. **Surah-boundary snap (10% rule):** when crossing into a new surah and `remaining budget < 10% of pageBudget` → stop at the boundary.
5. **Post-loop extension (110% rule):** after the loop, if finishing the current surah costs ≤ 110% of original budget → extend to complete it.
6. Return `{ from: start, to: lastAccepted, pagesUsed: accumulated }`.

### Position comparisons

All `isPastTerminus`, `isInRange`, and exclusion-zone checks use `orderInQuran` (integer comparison) instead of `comparePositions({surah, ayah})`. This eliminates the struct-decomposition bugs that caused boundary errors.

## Algorithm Changes

### New Memorization

**File:** `frontend/src/lib/algorithm/newMemorization.ts`

```ts
// Before:
advanceByPages(cursor, linesPerSession / 15, memDir)

// After:
walkByWeight(cursor, linesPerSession / 15, memDir)
```

No `stopPlace`. No exclusions. Simple forward walk.

### Minor Revision

**File:** `frontend/src/lib/algorithm/minorRevision.ts`

Walk backward from the frontier (adjacent to memorization start) through memorization history, accumulating `weightOnPage` until `minorRevPages` is reached.

```ts
walkByWeight(frontier, minorRevPages, oppositeDir)
```

Replaces the current loop that counts page spans per surah.

### Major Revision — Normal Walk

**File:** `frontend/src/lib/algorithm/majorRevision.ts`

```ts
walkByWeight(cursor, majRevPages, reviewDir, stopPlace = minorZone.surahId)
```

The `stopPlace` is the surah number of the minor zone's start. The walker stops before entering that surah, producing a clean block that never overlaps the minor zone.

### Major Revision — Wraparound Walk (`walkWithSkips`)

After the cursor hits the cycle terminus and resets to the frontier, remaining budget is consumed by `walkWithSkips`. This function already exists; the refactor replaces its internal `pageSpan()` measurement with `weightOnPage` accumulation.

Key refinements from verse data:
- **Budget tracking:** accumulate `weightOnPage` per verse instead of computing `pageSpan(pos, obstacle)`.
- **Position comparisons:** `pos.orderInQuran >= obstacle.orderInQuran` (ascending) instead of `comparePositions`.
- **Descending walk:** follow `reverseIndex` directly — structurally identical to ascending, no special-casing.

## UI Dropdowns (Preset Values)

No new config fields. `linesPerSession`, `minorRevPages`, `majRevPages` stay as `number`. The UI presents preset values; the selected value is stored directly.

**New Memorization (`linesPerSession`):**
| Display | Internal value |
|---|---|
| ٢ سطر | 2 (lines) |
| ٣ سطر | 3 |
| ٤ سطر | 4 |
| ٥ سطر | 5 |
| ٦ سطر | 6 |
| ٧ سطر / نصف صفحة | 7 |
| صفحة | 15 |
| صفحة ونصف | 22 (=1.5×15) |
| ٢ صفحة | 30 |
| ٣ صفحات | 45 |

The algorithm converts: `pageBudget = linesPerSession / 15`.

**Minor Revision (`minorRevPages`):** 1, 1.5, 2, 2.5 … 20 (step 0.5). Direct page values.

**Major Revision (`majRevPages`):** 1, 2, 3 … 10, 15, 20, 40, 60. Direct page values. (20 = 1 juz)

## Files Affected

| Action | File | Purpose |
|---|---|---|
| CREATE | `scripts/generate-verse-data.ts` | Build-time codegen: CSV → TS |
| CREATE | `frontend/src/lib/quran/verseData.ts` | Generated: typed verse arrays + lookup helpers |
| REWRITE | `frontend/src/lib/algorithm/helpers.ts` | Add `walkByWeight`, remove `advanceByPages` |
| REWRITE | `frontend/src/lib/algorithm/newMemorization.ts` | Use `walkByWeight` |
| REWRITE | `frontend/src/lib/algorithm/minorRevision.ts` | Weight-based accumulation |
| REWRITE | `frontend/src/lib/algorithm/majorRevision.ts` | Hybrid: `walkByWeight` + `walkWithSkips` (weight-based) |
| MODIFY | `frontend/src/lib/algorithm/planGenerator.ts` | Wire new walker calls |
| MODIFY | `frontend/src/components/setup/*` | Dropdown presets for 3 input fields |
| DELETE | `frontend/src/lib/quran/ayahPages.ts` | Replaced by `verseData.ts` |
| REWRITE | `frontend/src/lib/algorithm/__tests__/*` | Update all tests for new walker |

## What Is NOT Changing

- `QuranPosition = { surah, ayah }` — public interface unchanged.
- `StudentConfig` field names: `linesPerSession`, `minorRevPages`, `majRevPages`.
- Waterfall model logic in `majorRevision.ts` (terminus, frontier, unmemorized hole, Known Universe cap).
- `walkWithSkips` teleport-and-continue structure.
- 40-assignment plan length.
- `verse_difficulty.csv` — parked, not included.

## Testing

All existing tests are rewritten to use `verseData.ts` data. New tests added for `walkByWeight`:
- Budget exhaustion at exact page boundary.
- 10% surah-snap: stops at boundary when remainder < 10%.
- 110% extension: extends to complete surah when within budget.
- `stopPlace` hard wall: never enters the specified surah.
- Descending walk produces symmetric results to ascending.
- Integration: full 40-assignment plan with known scenario (Al-Ghashiyah descending).
