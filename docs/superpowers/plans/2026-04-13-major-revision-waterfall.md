# Major Revision Waterfall Wraparound Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken `computeStartLine` wraparound logic in `majorRevision.ts` with a Waterfall model that teleports to the frontier on wraparound and walks through the free zone, treating the minor zone as a hole.

**Architecture:** Single-file rewrite of `calculateMajorRevision`. Delete `computeStartLine` and `isBehindStartLine`. Add a tiny `computeFrontier` helper. Restructure the function body into three explicit cases (clean run, hole collision, wraparound). Reuse the existing `walkWithSkips` for both hole-collision and wraparound cases — it already handles skipping excluded zones.

**Tech Stack:** TypeScript, Vitest, Next.js 16.2.3 (frontend/).

**Spec:** [docs/superpowers/specs/2026-04-13-major-revision-waterfall-design.md](../specs/2026-04-13-major-revision-waterfall-design.md)

---

## File Structure

**Single file modified:**
- `frontend/src/lib/algorithm/majorRevision.ts` — rewrite of `calculateMajorRevision`, deletion of `computeStartLine` and `isBehindStartLine`, addition of `computeFrontier`.

**Tests:**
- `frontend/src/lib/algorithm/__tests__/visual.test.ts` — existing visual smoke test, used to verify W26/W36 output by eye.
- `frontend/src/lib/algorithm/__tests__/planGenerator.test.ts` — existing test suite, must continue to pass.

No new files. No changes to `planGenerator.ts`, `minorRevision.ts`, `newMemorization.ts`, or `helpers.ts`.

---

## Task 1: Add `computeFrontier` helper

**Files:**
- Modify: `frontend/src/lib/algorithm/majorRevision.ts`

- [ ] **Step 1: Add the helper function**

Insert the following function in `majorRevision.ts` directly above `computeStartLine` (which will be deleted in Task 2). Place it after `isBehindStartLine` and before `isInRange`:

```ts
/**
 * The frontier is the newest memorized position as of this assignment —
 * the ayah closest to where today's new task is happening. The major
 * revision wraparound teleports here and walks in the review direction
 * back through the older memorized material.
 *
 * For descending memDir, today's new task moves toward lower surah indices,
 * so the newest ayah has the LOWEST index = memRange.start (after normalize).
 * For ascending memDir, the newest ayah has the HIGHEST index = memRange.end.
 *
 * If memRange is null (defensive — should not happen in practice since
 * major revision is only called after new memorization runs), fall back to
 * the cycle start in the review direction.
 */
function computeFrontier(
  memRange: PositionRange | null,
  memDir: Direction
): QuranPosition {
  if (!memRange) {
    return memDir === "descending"
      ? { surah: TOTAL_SURAHS, ayah: getSurahByNumber(TOTAL_SURAHS).ayahCount }
      : { surah: 1, ayah: 1 };
  }
  return memDir === "descending" ? memRange.start : memRange.end;
}
```

- [ ] **Step 2: Verify the file still compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No new errors. (The existing `computeStartLine` is unused at this point only by the new helper, but `calculateMajorRevision` still calls it, so there should be zero new errors.)

- [ ] **Step 3: Run the existing test suite to confirm nothing broke**

Run: `cd frontend && npx vitest run`
Expected: All existing tests still pass (61 tests). The new helper is unused so far, so behavior is unchanged.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/algorithm/majorRevision.ts
git commit -m "feat(major-revision): add computeFrontier helper for waterfall wraparound"
```

---

## Task 2: Rewrite `calculateMajorRevision` with the three-case structure

**Files:**
- Modify: `frontend/src/lib/algorithm/majorRevision.ts`

This task replaces the body of `calculateMajorRevision` with the Waterfall model and deletes the now-unused `computeStartLine` and `isBehindStartLine` functions.

- [ ] **Step 1: Replace the body of `calculateMajorRevision`**

Find the existing function `calculateMajorRevision` in `majorRevision.ts` (starts around line 278). Replace the entire function with this new version:

```ts
/**
 * Major revision with a continuous, persistent cursor that walks the
 * "free zone" — every memorized ayah minus the minor zone hole — in the
 * review direction. On reaching the cycle terminus (An-Nas for ascending
 * review, Al-Fatihah for descending review), the cursor teleports to the
 * frontier (the newest memorized ayah) and resumes walking in the same
 * review direction, treating the minor zone as a hole to skip over.
 *
 * The cursor persists across assignments. Block 1 always continues from
 * where the previous assignment left off; on wraparound, block 2+ starts
 * at the current frontier.
 *
 * Three cases:
 *   A. Clean run    — cursor + budget fits before terminus, no hole crossed
 *   B. Hole collision — budget would cross an excluded zone mid-walk
 *   C. Wraparound   — budget overruns the terminus
 *
 * @param cursor          persistent cursor position (seeded from majRevStart on W1)
 * @param majRevPages     Y pages to cover this assignment
 * @param memDirection    student's memorization direction (review is opposite)
 * @param minorZoneRange  normalized Quran-order range of the minor zone (or null)
 * @param memRange        normalized Quran-order range of today's new memorization (or null)
 */
export function calculateMajorRevision(
  cursor: QuranPosition,
  majRevPages: number,
  memDirection: Direction,
  minorZoneRange: PositionRange | null,
  memRange: PositionRange | null = null
): MajorRevisionResult | null {
  if (majRevPages <= 0) return null;

  const reviewDir: Direction =
    memDirection === "descending" ? "ascending" : "descending";
  const cEnd = cycleEnd(reviewDir);
  const excluded: Array<PositionRange | null> = [minorZoneRange, memRange];
  const snapThreshold = computeSnapThreshold(majRevPages * LINES_PER_PAGE);

  // If the cursor has run off the cycle terminus from a previous wrap,
  // treat this as an immediate wraparound (block 1 is empty).
  let current = cursor;
  const cursorAtOrPastEnd =
    reviewDir === "ascending"
      ? comparePositions(current, cEnd) >= 0
      : comparePositions(current, cEnd) <= 0;

  if (cursorAtOrPastEnd) {
    // Pure wraparound: skip block 1, walk from frontier.
    const frontier = computeFrontier(memRange, memDirection);
    const walked = walkWithSkips(
      frontier,
      majRevPages,
      reviewDir,
      excluded,
      cEnd,
      snapThreshold
    );
    return { blocks: walked.blocks, newCursor: walked.newCursor };
  }

  // Walk from the current cursor with the full budget. walkWithSkips
  // handles both Case A (clean run) and Case B (hole collision) — it just
  // emits one block and stops, or splits around any holes it encounters.
  const walked = walkWithSkips(
    current,
    majRevPages,
    reviewDir,
    excluded,
    cEnd,
    snapThreshold
  );

  // Did the walk consume the full budget, or did it stop short because it
  // hit the cycle terminus? If short, this is Case C (wraparound): emit
  // block 1 (already in walked.blocks), then teleport to the frontier and
  // walk the remaining budget.
  const pagesEmitted = walked.blocks.reduce(
    (sum, b) => sum + pageSpan(b.from, b.to, reviewDir),
    0
  );
  const remaining = majRevPages - pagesEmitted;

  if (remaining <= 0.001) {
    // Case A or B — budget fully consumed.
    return { blocks: walked.blocks, newCursor: walked.newCursor };
  }

  // Case C — wraparound. Teleport to frontier and walk the remaining budget.
  const frontier = computeFrontier(memRange, memDirection);
  const walked2 = walkWithSkips(
    frontier,
    remaining,
    reviewDir,
    excluded,
    cEnd,
    snapThreshold
  );

  return {
    blocks: [...walked.blocks, ...walked2.blocks],
    newCursor: walked2.newCursor,
  };
}
```

- [ ] **Step 2: Delete the now-unused `computeStartLine` function**

Find and delete the entire `computeStartLine` function in `majorRevision.ts` (the function starts with `function computeStartLine(` and includes its full body — it's roughly 50 lines including the JSDoc comment immediately above it). Also delete the JSDoc comment block that documents it (the comment block starting with `/**\n * Compute the start-line of the major revision cycle after a wraparound.`).

- [ ] **Step 3: Delete the now-unused `isBehindStartLine` function**

Find and delete the entire `isBehindStartLine` function in `majorRevision.ts` along with its JSDoc comment. The function is about 10 lines including the comment.

- [ ] **Step 4: Verify `walkWithSkips` already handles "start position is inside an excluded zone"**

Read [frontend/src/lib/algorithm/majorRevision.ts](../../../frontend/src/lib/algorithm/majorRevision.ts) and confirm that `walkWithSkips` contains this check at the top of its main loop:

```ts
if (isInRange(pos, r)) {
  // Skip past it
  const after = getNextAyah(far, reviewDir);
  if (after) {
    const afterSurahStart: QuranPosition = { surah: after.surah, ayah: 1 };
    pos = (!isExcluded(afterSurahStart, excluded) && after.surah !== far.surah)
      ? afterSurahStart
      : after;
  }
  nextExcludedStart = null; // re-evaluate after skip
  break;
}
```

If this block exists, the W36 case (frontier inside excluded zone) is already handled. If it does NOT exist, add it as the first thing inside the `for (const r of excluded)` loop. Expected: it already exists from prior work in this session.

- [ ] **Step 5: TypeScript check — confirm the file compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: Zero errors. Common failure mode: forgot to remove an import that was only used by `computeStartLine` or `isBehindStartLine`. If TypeScript complains about an unused import, remove that import. Specifically check whether `maybeSnapToSurahBoundary` is still used (it should be — `walkWithSkips` uses it). Check whether any helper-only import like `getNextAyah` is still used (it should be — `walkWithSkips` uses it).

- [ ] **Step 6: Run the existing test suite**

Run: `cd frontend && npx vitest run`
Expected: All previously-passing tests still pass. Specifically the 61 tests from prior work. If a test fails, do NOT proceed — read the failure carefully. Most likely failures: edge case in `pageSpan` accumulation (try logging `pagesEmitted` and `remaining`), or the cursor-at-end check sign error.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/lib/algorithm/majorRevision.ts
git commit -m "refactor(major-revision): replace computeStartLine with waterfall wraparound"
```

---

## Task 3: Add a regression test for the W26 waterfall wraparound

**Files:**
- Modify: `frontend/src/lib/algorithm/__tests__/planGenerator.test.ts`

This test pins the W26 expected output so future changes can't silently regress it.

- [ ] **Step 1: Read the existing test file to find the right insertion point**

Read [frontend/src/lib/algorithm/__tests__/planGenerator.test.ts](../../../frontend/src/lib/algorithm/__tests__/planGenerator.test.ts). Find the closing `});` of the outermost `describe(...)` block. The new test will be added inside that describe, at the end.

- [ ] **Step 2: Add the failing regression test**

Insert this test inside the existing top-level `describe` block, right before its closing `});`:

```ts
  it("W26 wraparound walks from frontier through Al-Jathiyah → Al-Ahqaf → Muhammad", () => {
    // Setup that produces the W26 wraparound case described in the spec:
    // descending memorization starting at Muhammad (47), moving toward Al-Baqarah,
    // with a minor zone large enough that by W26 the major cursor wraps and the
    // frontier sits in the Ad-Dukhan / Az-Zukhruf area.
    const plan = generatePlan({
      id: "test-w26",
      name: "test",
      halaqah: "test",
      planType: "independent",
      memStartSurah: 47,
      memStartAyah: 1,
      linesPerSession: 15,
      direction: "descending",
      minorRevPages: 5,
      majRevStartSurah: 58,
      majRevStartAyah: 1,
      majRevPages: 3,
    });

    const w26 = plan.assignments.find((a) => a.assignmentNumber === 26);
    expect(w26).toBeDefined();
    expect(w26!.majorBlocks.length).toBeGreaterThanOrEqual(2);

    // Block 1 must end at An-Nas (the cycle terminus for ascending review).
    const block1 = w26!.majorBlocks[0];
    expect(block1.to).toContain("الناس");

    // Block 2+ must include content from Al-Jathiyah / Al-Ahqaf / Muhammad —
    // the older memorized surahs that the waterfall walks back through.
    const allBlockText = w26!.majorBlocks
      .slice(1)
      .map((b) => `${b.from} ${b.to}`)
      .join(" ");
    const mentionsExpectedSurah =
      allBlockText.includes("الجاثية") ||
      allBlockText.includes("الأحقاف") ||
      allBlockText.includes("الاحقاف") ||
      allBlockText.includes("محمد");
    expect(mentionsExpectedSurah).toBe(true);
  });
```

- [ ] **Step 3: Run only this new test to confirm it passes**

Run: `cd frontend && npx vitest run --reporter=verbose -t "W26 wraparound"`
Expected: PASS. If it fails, the most likely reason is that with this specific config, W26 is not actually a wraparound assignment. In that case, run the visual test (`npx vitest run -t "show all 40 assignments"`) and find an assignment that IS a wraparound, then update the test's `assignmentNumber` accordingly. Update the test name to match.

- [ ] **Step 4: Run the full suite to confirm nothing else broke**

Run: `cd frontend && npx vitest run`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/algorithm/__tests__/planGenerator.test.ts
git commit -m "test(major-revision): pin W26 waterfall wraparound output"
```

---

## Task 4: Visual verification of W26 and W36 output

**Files:**
- Read-only verification using: `frontend/src/lib/algorithm/__tests__/visual.test.ts`

This task does not change code. It runs the visual test and inspects the W26/W36 output by eye to confirm it matches the user's expected strings.

- [ ] **Step 1: Run the visual test with output capture**

Run: `cd frontend && npx vitest run -t "show all 40 assignments" --reporter=verbose 2>&1 | tee /tmp/visual-output.txt`
Expected: The test runs and prints all 40 assignments. The console.log lines start with `W 1 |`, `W 2 |`, ... `W40 |`.

- [ ] **Step 2: Locate W26 in the output**

Read `/tmp/visual-output.txt` and find the line starting with `W26 |`. The expected output for W26 (from the spec) is approximately:

```
W26 | حفظ: ... | صغيرة: ... | كبيرة: الكافرون ١ ← الناس ٦ • <stuff in Al-Jathiyah/Al-Ahqaf/Muhammad area>
```

Confirm:
- Block 1 ends at الناس ٦ (or contains الناس)
- Block 2+ contains content in the older memorized surahs (الجاثية, الأحقاف, محمد)
- Block 2+ does NOT include content inside the minor zone (the minor zone is reported in the `صغيرة:` column for that row — verify the major blocks don't overlap that range)

- [ ] **Step 3: Locate W36 in the output**

Find the `W36 |` line. The expected output (from the spec) is approximately:

```
W36 | حفظ: ... | صغيرة: ... | كبيرة: القارعة ١ ← الناس ٦ • الدخان ١ - الدخان ٥٩
```

Confirm:
- Block 1 contains الناس
- Block 2 contains الدخان (or is in the surah immediately past the minor zone in review direction)
- Block 2 does NOT overlap the minor zone shown in the `صغيرة:` column

- [ ] **Step 4: If W26 or W36 do NOT match, debug and report**

If the output is wrong, do NOT silently fix it. Instead, capture:
1. The exact W26 and W36 lines from the output
2. The exact `حفظ:` (memorization) and `صغيرة:` (minor) columns for those rows
3. The frontier the algorithm computed for those rows (add a temporary `console.log` inside `calculateMajorRevision` printing `frontier` and `cursor` for assignments 26 and 36, re-run, then remove the log)

Report these to the user before continuing. The Waterfall design assumes the frontier is at today's `memResult.to`; if the frontier ends up in an unexpected position, that assumption needs re-examination.

- [ ] **Step 5: If everything matches, mark verification complete**

No commit needed for this task — it's verification only. Move on to Task 5.

---

## Task 5: Final cleanup and commit

**Files:**
- Modify: `frontend/src/lib/algorithm/majorRevision.ts` (only if cleanup needed)

- [ ] **Step 1: Re-read `majorRevision.ts` end-to-end and check for dead code**

Read [frontend/src/lib/algorithm/majorRevision.ts](../../../frontend/src/lib/algorithm/majorRevision.ts) from start to end. Look for:
- Unused imports (anything from `./helpers` or `@/lib/quran/*` that is no longer referenced after deleting `computeStartLine` and `isBehindStartLine`)
- Stale JSDoc comments referencing `startLine` or "computeStartLine"
- Leftover code that mentions `startLine` as a variable name (the new `calculateMajorRevision` should never use that name)

- [ ] **Step 2: Remove any dead code found**

Make targeted edits to remove unused imports or stale comments. Do not refactor anything else — stay scoped to dead code removal.

- [ ] **Step 3: Final TypeScript check**

Run: `cd frontend && npx tsc --noEmit`
Expected: Zero errors.

- [ ] **Step 4: Final test suite run**

Run: `cd frontend && npx vitest run`
Expected: All tests pass, including the new W26 regression test from Task 3.

- [ ] **Step 5: Commit (only if cleanup edits were made)**

```bash
git add frontend/src/lib/algorithm/majorRevision.ts
git commit -m "chore(major-revision): remove dead code from waterfall refactor"
```

If no cleanup was needed, skip the commit. The branch is now ready for the user to test in the browser.

---

## Verification Checklist

After all tasks complete, the following should all be true:

1. `cd frontend && npx tsc --noEmit` — zero errors
2. `cd frontend && npx vitest run` — all tests pass (62 tests: prior 61 + new W26 regression)
3. `frontend/src/lib/algorithm/majorRevision.ts` no longer contains `computeStartLine` or `isBehindStartLine`
4. `frontend/src/lib/algorithm/majorRevision.ts` contains a new `computeFrontier` helper
5. `calculateMajorRevision` body uses the three-case structure (clean run / hole collision / wraparound) and calls `walkWithSkips` from the frontier on wraparound
6. The visual test output for W26 shows block 1 ending at الناس and block 2+ containing الجاثية/الأحقاف/محمد
7. The visual test output for W36 shows block 1 containing الناس and block 2 containing الدخان

The user will then click "Generate Plans" in the browser to verify the live UI also produces the expected output.
