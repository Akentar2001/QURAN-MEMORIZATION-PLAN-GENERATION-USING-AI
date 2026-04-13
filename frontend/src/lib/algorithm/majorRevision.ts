import type { QuranPosition, PositionRange, Direction } from "@/lib/quran/types";
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

/**
 * The cycle terminus = the oldest edge of the Known Universe in the review
 * direction. For descending mem (ascending review) this is the last ayah of
 * the oldest historical surah (majRevStart). For ascending mem (descending
 * review) this is ayah 1 of the oldest historical surah (still majRevStart,
 * since ascending mem starts at low index and goes up).
 *
 * majRevStart is the student's oldest historical memorization boundary
 * (e.g., "Juz Amma starting at An-Nas" → majRevStart = {114, 1}).
 */
function cycleTerminus(
  majRevStart: QuranPosition,
  reviewDir: Direction
): QuranPosition {
  if (reviewDir === "ascending") {
    // Walk ends at the LAST ayah of the oldest surah (entire surah is in scope).
    const surahInfo = getSurahByNumber(majRevStart.surah);
    return { surah: majRevStart.surah, ayah: surahInfo.ayahCount };
  }
  // Ascending mem / descending review: walk ends at ayah 1 of the oldest surah.
  return { surah: majRevStart.surah, ayah: 1 };
}

/**
 * The frontier is the first memorized ayah past today's new task in the
 * review direction. It is the entry point into the "older memorized" material
 * that the walker will patrol.
 *
 * For descending memDir (review = ascending): frontier = next ayah after
 * memRange.start in ascending order. This lands inside the unmemorized tail
 * of today's active surah, but that tail is marked as an excluded hole so
 * walkWithSkips will teleport past it to the next fully-memorized surah.
 *
 * For ascending memDir (review = descending): frontier = next ayah before
 * memRange.end in descending order.
 */
function computeFrontier(
  memRange: PositionRange | null,
  memDir: Direction,
  majRevStart: QuranPosition
): QuranPosition {
  if (!memRange) {
    return majRevStart;
  }
  const todayBoundary = memDir === "descending" ? memRange.start : memRange.end;
  const reviewDir: Direction = memDir === "descending" ? "ascending" : "descending";
  const next = getNextAyah(todayBoundary, reviewDir);
  return next ?? todayBoundary;
}

/**
 * The unmemorized hole is the tail of today's active surah that the student
 * hasn't reached yet. For a student memorizing surah N with today's task
 * covering ayahs 1..K, ayahs K+1..last are unmemorized and must be excluded
 * from major review. Within a surah, memorization always proceeds ayah 1 →
 * last, regardless of overall direction.
 */
function computeUnmemorizedHole(
  memRange: PositionRange | null,
  memDir: Direction
): PositionRange | null {
  if (!memRange) return null;
  const activeSurahPos = memDir === "descending" ? memRange.start : memRange.end;
  const surahInfo = getSurahByNumber(activeSurahPos.surah);
  if (activeSurahPos.ayah >= surahInfo.ayahCount) return null;
  return {
    start: { surah: activeSurahPos.surah, ayah: activeSurahPos.ayah + 1 },
    end: { surah: activeSurahPos.surah, ayah: surahInfo.ayahCount },
  };
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
 * Major revision confined to the student's Known Universe — the already-
 * memorized content between the frontier (just past today's new task) and
 * the oldest historical boundary (majRevStart).
 *
 * The walker patrols this universe in the review direction, treating the
 * minor zone and today's unmemorized tail as holes to skip. It never
 * enters unmemorized territory.
 *
 * If the cursor runs off the terminus mid-assignment, it wraps back to the
 * frontier and continues. If the budget exceeds the size of the universe,
 * the walker caps at the terminus and under-delivers the budget (no
 * same-session repetition).
 *
 * @param cursor          persistent cursor position (seeded from majRevStart on W1)
 * @param majRevPages     Y pages to cover this assignment
 * @param memDirection    student's memorization direction (review is opposite)
 * @param minorZoneRange  normalized Quran-order range of the minor zone (or null)
 * @param memRange        normalized Quran-order range of today's new memorization (or null)
 * @param majRevStart     the oldest historical memorization boundary (required)
 */
export function calculateMajorRevision(
  cursor: QuranPosition,
  majRevPages: number,
  memDirection: Direction,
  minorZoneRange: PositionRange | null,
  memRange: PositionRange | null,
  majRevStart: QuranPosition
): MajorRevisionResult | null {
  if (majRevPages <= 0) return null;

  const reviewDir: Direction =
    memDirection === "descending" ? "ascending" : "descending";
  const terminus = cycleTerminus(majRevStart, reviewDir);
  const unmemorizedHole = computeUnmemorizedHole(memRange, memDirection);
  const excluded: Array<PositionRange | null> = [
    minorZoneRange,
    memRange,
    unmemorizedHole,
  ];
  const snapThreshold = computeSnapThreshold(majRevPages * LINES_PER_PAGE);
  const frontier = computeFrontier(memRange, memDirection, majRevStart);

  // If the cursor is outside the Known Universe or at/past the terminus,
  // reset to the frontier. This handles the first assignment (cursor seeded
  // from majRevStart which is at or past terminus) and any stale sentinel.
  const isPastTerminus =
    reviewDir === "ascending"
      ? comparePositions(cursor, terminus) >= 0
      : comparePositions(cursor, terminus) <= 0;
  const isBeforeFrontier =
    reviewDir === "ascending"
      ? comparePositions(cursor, frontier) < 0
      : comparePositions(cursor, frontier) > 0;

  let current = isPastTerminus || isBeforeFrontier ? frontier : cursor;

  const blocks: MajorBlockRange[] = [];
  let remaining = majRevPages;
  let loopSafety = 5;

  while (remaining > 0.001 && loopSafety-- > 0) {
    const walked = walkWithSkips(
      current,
      remaining,
      reviewDir,
      excluded,
      terminus,
      snapThreshold
    );
    blocks.push(...walked.blocks);

    const pagesEmitted = walked.blocks.reduce(
      (sum, b) => sum + pageSpan(b.from, b.to, reviewDir),
      0
    );
    remaining -= pagesEmitted;

    if (remaining <= 0.001) {
      return { blocks, newCursor: walked.newCursor };
    }

    // Walker hit the terminus before filling the budget. Per product rules
    // (no same-assignment repetition), cap and stop. Next assignment will
    // start fresh from the new frontier.
    if (pagesEmitted === 0) break;

    // If the walker emitted progress but still didn't fill the budget, it
    // hit the terminus. Stop here (cap at universe size).
    break;
  }

  const lastBlock = blocks[blocks.length - 1];
  const newCursor = lastBlock
    ? (getNextAyah(lastBlock.to, reviewDir) ?? lastBlock.to)
    : frontier;

  return { blocks, newCursor };
}
