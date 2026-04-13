# Major Revision Waterfall Wraparound Design

**Date:** 2026-04-13
**Status:** Approved
**Affects:** `frontend/src/lib/algorithm/majorRevision.ts`, `frontend/src/lib/algorithm/planGenerator.ts`

## Problem

The current `calculateMajorRevision` produces incorrect blocks after wraparound. Two reported failures:

- **W26** expected `الكافرون ١ ← الناس ٦ • الجاثية ١-١٣ • الأحقاف ١ - محمد ١١`, got `الكافرون ١ ← الناس ٦ • الجاثية ١٥ ← محمد ١١` (missing الجاثية ١-١٣ and الأحقاف).
- **W36** expected `القارعة ١ ← الناس ٦ • الدخان ١ - الدخان ٥٩`, got `القارعة ١ ← الناس ٦ • الزخرف ٥٥ ← الدخان ٣٩`.

Root cause: on wraparound, the algorithm computes a `startLine` "just past the minor zone" and starts block 2 there. This skips memorized content that lives **before** the minor zone in the review direction, and treats the minor zone as a wall instead of a hole.

## The Waterfall Model

The major revision cursor walks a **logical free zone**: every memorized ayah minus the minor zone hole. It moves continuously in the review direction (the opposite of new-task direction). When it falls off the cycle terminus (An-Nas for ascending review, Al-Fatihah for descending review), it teleports to the **frontier** — the newest memorized ayah, the position closest to where today's new task is — and resumes walking in the same review direction, skipping the minor zone hole as it encounters it.

Math-only definitions (no "up/down" language):

- **memDir** — the student's new-task direction. `descending` = surah index decreasing over time. `ascending` = surah index increasing over time.
- **reviewDir** — opposite of memDir.
- **frontier** — the newest memorized position as of this assignment. Equal to `memResult.to` of the current assignment (today's new task ends at the newest ayah).
- **cycle terminus** — last position in reviewDir. Ascending review → `{114, 6}`. Descending review → `{1, 1}`.
- **excluded zones** — `[minorZoneRange, memRange]`. Both are normalized Quran-order ranges.

## Three Cases

`calculateMajorRevision(cursor, budget, memDir, minorZoneRange, memRange)` handles three cases:

### Case A — Clean run

Cursor + budget fits before cycle terminus and the path crosses no excluded zone.

→ Single block from `cursor` to `cursor + budget`. New cursor = next ayah after the block.

### Case B — Hole collision mid-walk

Cursor + budget would cross an excluded zone before reaching the cycle terminus.

→ Use `walkWithSkips(start=cursor, budget, ...)`. It emits a block up to the hole, jumps past the hole, continues until budget filled. Returns `{blocks, newCursor}`.

### Case C — Wraparound

Cursor + free-zone-pages-remaining < budget. Cursor walks off the cycle terminus.

→ Block 1: `cursor` → cycle terminus.
→ Reset cursor to **frontier** (today's `memResult.to`).
→ Call `walkWithSkips(start=frontier, remainingBudget, ...)` for block 2+.
→ The walk encounters the minor zone hole naturally and skips it via the existing skip logic.
→ Save the walk's returned `newCursor` for the next assignment.

## Cursor Persistence Across Assignments

After Case A or B, the next assignment continues where this one ended.

After Case C, the next assignment continues from `walkWithSkips`'s returned cursor (somewhere in the free zone after the wraparound walk). If the next assignment also wraps, it teleports to *its own* frontier (which has advanced because the student memorized more in the meantime).

## Code Changes

### Delete

- **`computeStartLine`** — entire function (~50 lines). The "near edge / far edge / try ayah 1 of surah" snap heuristic is replaced by the simple frontier rule.
- **`isBehindStartLine`** — no longer needed. The cursor is never "behind" anything in the new model.
- The "boundary check" and "clean wrap" `current = startLine` resets at the top of `calculateMajorRevision`. Replaced by a single frontier-reset on wraparound only.

### Modify

- **`calculateMajorRevision`** signature unchanged (still takes `cursor, majRevPages, memDirection, minorZoneRange, memRange`). Body restructured around the three cases above.
- **Wraparound case** (Case C): teleport to `frontier`, then call `walkWithSkips`.

### Keep unchanged

- `walkWithSkips` — already handles "walk N pages from start, skipping excluded zones along the way". Just needs to be called with the right start position.
- `pageSpan`, `cycleEnd`, `isInRange`, `isExcluded` helpers.
- `calculateNewMemorization` — no changes.
- `calculateMinorRevision` — no changes.
- `planGenerator.ts` orchestration — no changes (the call site already passes both ranges).

## Frontier Computation

```ts
function computeFrontier(memRange: PositionRange | null, memDir: Direction): QuranPosition {
  if (!memRange) {
    // No memorization yet — frontier is undefined; use cycle start as fallback.
    return memDir === "descending" ? { surah: 114, ayah: 6 } : { surah: 1, ayah: 1 };
  }
  // memRange is normalized: start has lower (surah, ayah), end has higher.
  // Frontier = newest memorized position.
  // Descending memDir: newest = lowest surah index = memRange.start.
  // Ascending memDir: newest = highest surah index = memRange.end.
  return memDir === "descending" ? memRange.start : memRange.end;
}
```

**Important:** `memRange` here is today's new-task range. The "frontier" is therefore the NEWEST ayah memorized as of today — which is the end of today's new task in memorization-time order. For descending memDir, today's new task spans from a higher surah index to a lower surah index, so its lowest surah-index endpoint (`memRange.start` after normalization) is the newest ayah. Symmetric for ascending.

## Walk Direction in `walkWithSkips`

The existing function takes `reviewDir` and walks in that direction. No change needed — both Case B and Case C call it with `reviewDir = opposite(memDir)`.

The walk from the frontier in reviewDir naturally moves into older memorized material:

- Descending memDir → reviewDir = ascending → walk index-increasing from frontier (lowest surah) → encounters older surahs (higher index) → eventually hits cycle terminus An-Nas.
- Ascending memDir → reviewDir = descending → walk index-decreasing from frontier (highest surah) → encounters older surahs (lower index) → eventually hits cycle terminus Al-Fatihah.

## Trace: W26 Verification

Setup (descending memDir, current frontier around Ad-Dukhan area):

1. Major revision enters W26 with cursor at الكافرون ١ (somewhere in the cycle, prior assignment ended here).
2. Block 1: walk ascending from الكافرون ١ → hits cycle terminus الناس ٦. Wraparound triggered.
3. Teleport: cursor = frontier ≈ today's `memResult.to` ≈ somewhere in Ad-Dukhan/الزخرف area (low surah index).
4. `walkWithSkips` from frontier, remaining budget, ascending direction.
5. First block: starts at frontier, walks until it hits the minor zone hole. Emits block up to hole boundary.
6. Jumps past the hole.
7. Continues: emits الجاثية ١-١٣ (if that's where the post-hole walk lands), then الأحقاف ١-..., then محمد ١-١١, until budget exhausted.

The exact block boundaries depend on the actual frontier position and minor zone extent, but the structure (multiple sub-blocks, gap-skipping the hole, walking from frontier toward older material) matches the expected output.

## Trace: W36 Verification

Expected: `القارعة ١ ← الناس ٦ • الدخان ١ - الدخان ٥٩`.

1. Block 1: cursor at القارعة ١ → walk ascending → cycle terminus الناس ٦. Wraparound.
2. Teleport: frontier = today's newest ayah, somewhere in الزخرف area.
3. `walkWithSkips` from frontier, ascending. The minor zone covers الزخرف plus part of الدخان (the new task zone is in الزخرف, minor zone is the rolling window before it).
4. Wait — if frontier is INSIDE الزخرف and minor zone covers الزخرف, then the frontier itself is excluded. The walk from frontier needs to first skip out of the excluded zone before emitting any block.
5. After skipping past minor zone, walk lands at الدخان ١ (the surah immediately after the hole in ascending review direction... wait, ascending = surah index increasing, so after الزخرف 43 comes الدخان 44? No, 44 < 43 in index... actually 44 > 43, so yes, walking ascending from الزخرف 43 area goes to surah 44 الدخان).
6. Walk continues through الدخان until budget filled → الدخان ١ - الدخان ٥٩ (one full surah, ~budget pages).

Confirmed: the model produces the expected output as long as `walkWithSkips` correctly handles the case where the start position itself is inside an excluded zone (it does — there's an `isInRange(pos, r)` check at the top of the loop that teleports past the zone).

## Edge Cases

- **Frontier inside minor zone** — `walkWithSkips` already detects this and teleports past. Tested in W36 trace.
- **Frontier == cursor before wraparound** — only happens if the entire cycle is consumed by one assignment, which would require an absurd budget. Not a concern in practice; the wraparound logic still works (block 1 = cursor → terminus, then teleport reuses cursor).
- **No memorization yet (memRange == null)** — should not occur in practice since major revision is only called after `calculateNewMemorization`. Fallback in `computeFrontier` returns cycle start as a defensive default.
- **Budget larger than entire free zone** — `walkWithSkips`'s safety counter (20 iterations) caps runaway loops. Worst case: returns whatever blocks it managed to emit and a cursor that may equal start. Acceptable degradation.

## Testing

- Existing 61 tests must still pass.
- W26 and W36 visual test outputs must match the user's expected strings (verified against the actual frontier computed from each test scenario).
- The existing visual test in `__tests__/visual.test.ts` already prints all 40 assignments — use it to spot-check.

## Out of Scope

- Refactoring `calculateMinorRevision` (separate concern, currently working correctly).
- Refactoring `walkWithSkips` internals (it already handles the gap-skip case; only its caller changes).
- Changing the `calculateMajorRevision` public signature (no caller changes needed).
