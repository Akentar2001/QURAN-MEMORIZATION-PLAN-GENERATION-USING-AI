import type { QuranPosition, PositionRange, Direction } from "@/lib/quran/types";
import { TOTAL_SURAHS } from "@/lib/quran/constants";
import { getSurahByNumber } from "@/lib/quran/surahs";
import { getAyahPage } from "@/lib/quran/ayahPages";
import {
  advanceByPages,
  comparePositions,
  computeSnapThreshold,
  getNextAyah,
  maybeSnapToSurahBoundary,
} from "./helpers";
import { LINES_PER_PAGE } from "@/lib/quran/constants";

export interface MajorBlockRange {
  from: QuranPosition;
  to: QuranPosition;
}

export interface MajorRevisionResult {
  blocks: MajorBlockRange[];
  newCursor: QuranPosition;
}

/** The terminal position of the review cycle in the review direction. */
function cycleEnd(reviewDir: Direction): QuranPosition {
  if (reviewDir === "ascending") {
    const last = getSurahByNumber(TOTAL_SURAHS);
    return { surah: TOTAL_SURAHS, ayah: last.ayahCount };
  }
  return { surah: 1, ayah: 1 };
}

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

/** Returns true if `pos` is inside `range` (inclusive, Quran order). */
function isInRange(pos: QuranPosition, range: PositionRange): boolean {
  return comparePositions(pos, range.start) >= 0 && comparePositions(pos, range.end) <= 0;
}

/** Returns true if `pos` is inside any of the given excluded zones. */
function isExcluded(
  pos: QuranPosition,
  excluded: Array<PositionRange | null>
): boolean {
  return excluded
    .filter((r): r is PositionRange => r !== null)
    .some((r) => isInRange(pos, r));
}

/**
 * Walk from `start` in `reviewDir` consuming exactly `budgetPages` of content,
 * skipping over any excluded zones mid-walk. Returns an array of {from, to}
 * blocks and the position after the last block (new cursor).
 *
 * If the walk hits an excluded zone, it teleports to one past the zone's far
 * edge (snapping to ayah 1 of the next clean surah when possible) and continues.
 */
function walkWithSkips(
  start: QuranPosition,
  budgetPages: number,
  reviewDir: Direction,
  excluded: Array<PositionRange | null>,
  cEnd: QuranPosition,
  snapThreshold: number
): { blocks: MajorBlockRange[]; newCursor: QuranPosition } {
  const blocks: MajorBlockRange[] = [];
  let remaining = budgetPages;
  let pos = start;
  const safety = 20;
  let iter = 0;

  while (remaining > 0.001 && iter++ < safety) {
    // Clamp to cycle end
    if (reviewDir === "ascending" && comparePositions(pos, cEnd) > 0) break;
    if (reviewDir === "descending" && comparePositions(pos, cEnd) < 0) break;

    // Find the next excluded zone boundary ahead of pos in the review direction.
    // If `pos` is inside an excluded range, teleport past it and restart the
    // while loop so obstacles are re-detected at the new position.
    let nextExcludedStart: QuranPosition | null = null;
    let teleported = false;
    for (const r of excluded) {
      if (!r) continue;
      // The "near" edge of this range in the review direction
      const near = reviewDir === "ascending" ? r.start : r.end;
      const far  = reviewDir === "ascending" ? r.end   : r.start;
      // Is `pos` already inside this range?
      if (isInRange(pos, r)) {
        // Skip past it
        const after = getNextAyah(far, reviewDir);
        if (after) {
          const afterSurahStart: QuranPosition = { surah: after.surah, ayah: 1 };
          pos = (!isExcluded(afterSurahStart, excluded) && after.surah !== far.surah)
            ? afterSurahStart
            : after;
        }
        teleported = true;
        break;
      }
      // Is this range ahead of pos in the review direction?
      const ahead = reviewDir === "ascending"
        ? comparePositions(near, pos) > 0
        : comparePositions(near, pos) < 0;
      if (ahead) {
        if (!nextExcludedStart) {
          nextExcludedStart = near;
        } else {
          const betterNear = reviewDir === "ascending"
            ? comparePositions(near, nextExcludedStart) < 0
            : comparePositions(near, nextExcludedStart) > 0;
          if (betterNear) nextExcludedStart = near;
        }
      }
    }

    // After teleporting past an excluded zone, restart the while loop so the
    // next obstacle is detected from the new position.
    if (teleported) continue;

    // How many pages until the next obstacle (excluded zone or cycle end)?
    const obstacle = (() => {
      if (!nextExcludedStart) return cEnd;
      // One ayah before the excluded zone starts
      const beforeExcluded = getNextAyah(nextExcludedStart,
        reviewDir === "ascending" ? "descending" : "ascending");
      return beforeExcluded ?? nextExcludedStart;
    })();

    const pagesTo = pageSpan(pos, obstacle, reviewDir);

    if (remaining <= pagesTo) {
      // Budget fits before the obstacle — emit one block and done.
      const rawEnd = advanceByPages(pos, remaining, reviewDir);
      if (!rawEnd) break;
      const snapped = maybeSnapToSurahBoundary(rawEnd, reviewDir, snapThreshold);
      // Clamp to the obstacle so the snap can't push us into an excluded zone.
      const clampedToObstacle = reviewDir === "ascending"
        ? (comparePositions(snapped, obstacle) > 0 ? obstacle : snapped)
        : (comparePositions(snapped, obstacle) < 0 ? obstacle : snapped);
      const blockEnd = reviewDir === "ascending"
        ? (comparePositions(clampedToObstacle, cEnd) > 0 ? cEnd : clampedToObstacle)
        : (comparePositions(clampedToObstacle, cEnd) < 0 ? cEnd : clampedToObstacle);
      blocks.push({ from: pos, to: blockEnd });
      const nc = getNextAyah(blockEnd, reviewDir);
      return { blocks, newCursor: nc ?? blockEnd };
    }

    // Emit a block up to the obstacle, then skip the excluded zone.
    blocks.push({ from: pos, to: obstacle });
    remaining -= pagesTo;

    if (!nextExcludedStart) {
      // Hit cycle end
      return { blocks, newCursor: start };
    }

    // Jump past the excluded zone
    const excludedRange = excluded.find((r): r is PositionRange => {
      if (!r) return false;
      const near = reviewDir === "ascending" ? r.start : r.end;
      return comparePositions(near, nextExcludedStart!) === 0;
    });
    if (!excludedRange) break;
    const far = reviewDir === "ascending" ? excludedRange.end : excludedRange.start;
    const afterFar = getNextAyah(far, reviewDir);
    if (!afterFar) break;
    const afterSurahStart: QuranPosition = { surah: afterFar.surah, ayah: 1 };
    pos = (!isExcluded(afterSurahStart, excluded) && afterFar.surah !== far.surah)
      ? afterSurahStart
      : afterFar;
  }

  const nc = blocks.length > 0
    ? (getNextAyah(blocks[blocks.length - 1].to, reviewDir) ?? blocks[blocks.length - 1].to)
    : start;
  return { blocks, newCursor: nc };
}

/**
 * Page-distance from `from` to `to` in the given direction (inclusive).
 * Returns how many pages are covered walking from `from` to `to`.
 */
function pageSpan(
  from: QuranPosition,
  to: QuranPosition,
  reviewDir: Direction
): number {
  const fromPage = getAyahPage(from.surah, from.ayah);
  const toPage = getAyahPage(to.surah, to.ayah);
  if (reviewDir === "ascending") return toPage - fromPage + 1;
  return fromPage - toPage + 1;
}

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
 *   A. Clean run     — cursor + budget fits before terminus, no hole crossed
 *   B. Hole collision — budget would cross an excluded zone mid-walk
 *   C. Wraparound    — budget overruns the terminus
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

  // Cursor is at or past the cycle terminus — either from a previous
  // wraparound (the prior assignment stored `start` as a sentinel in
  // walkWithSkips) or because the last assignment ended exactly on the
  // terminus. Either way, start fresh from the frontier (block 1 is empty).
  const cursorAtOrPastEnd =
    reviewDir === "ascending"
      ? comparePositions(cursor, cEnd) >= 0
      : comparePositions(cursor, cEnd) <= 0;

  if (cursorAtOrPastEnd) {
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
  // handles both Case A (clean run) and Case B (hole collision) — it emits
  // one block and stops if nothing is in the way, or splits around any
  // holes it encounters.
  const walked = walkWithSkips(
    cursor,
    majRevPages,
    reviewDir,
    excluded,
    cEnd,
    snapThreshold
  );

  // Did the walk consume the full budget, or did it stop short because it
  // hit the cycle terminus? If short, this is Case C (wraparound): keep
  // block 1 (already in walked.blocks), then teleport to the frontier and
  // walk the remaining budget.
  const pagesEmitted = walked.blocks.reduce(
    (sum, b) => sum + pageSpan(b.from, b.to, reviewDir),
    0
  );
  const remaining = majRevPages - pagesEmitted;

  if (remaining <= 0.001) {
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
