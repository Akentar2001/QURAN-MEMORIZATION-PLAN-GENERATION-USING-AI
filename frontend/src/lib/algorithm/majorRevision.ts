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
 * Is `cursor` behind `startLine` in the review direction? (i.e. before or inside
 * the minor zone — needs to be pushed forward to startLine.)
 */
function isBehindStartLine(
  cursor: QuranPosition,
  startLine: QuranPosition,
  reviewDir: Direction
): boolean {
  if (reviewDir === "ascending") {
    return comparePositions(cursor, startLine) < 0;
  }
  return comparePositions(cursor, startLine) > 0;
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
 * Compute the start-line of the major revision cycle after a wraparound.
 *
 * Goal: find the earliest position in the review direction that is NOT inside
 * any excluded zone, such that the wraparound block starts from a clean surah
 * boundary when possible.
 *
 * Strategy:
 * 1. Find the oldest excluded boundary in the review direction (the "near" edge
 *    of the union of excluded zones). For ascending review this is the smallest
 *    position in the excluded zones.
 * 2. Try ayah 1 of that surah. If it is not excluded, use it — this covers the
 *    pre-minor-zone part of the surah (e.g. الجاثية ١-١٣ when minor starts at ١٤).
 * 3. If ayah 1 is excluded (the entire surah start is inside the exclusion),
 *    step one past the furthest excluded edge instead.
 */
function computeStartLine(
  minorZoneRange: PositionRange | null,
  memRange: PositionRange | null,
  reviewDir: Direction
): QuranPosition {
  const excluded = [minorZoneRange, memRange];
  const excludedRanges = excluded.filter((r): r is PositionRange => r !== null);

  if (excludedRanges.length === 0) {
    return reviewDir === "ascending"
      ? { surah: 1, ayah: 1 }
      : cycleEnd("ascending");
  }

  // "Near" edge: the edge of the exclusion union that is earliest in the
  // review direction (this is where the wraparound block should ideally start).
  // For ascending review: the smallest (lowest) position among all excluded starts.
  // For descending review: the largest (highest) position among all excluded ends.
  const nearEdge = excludedRanges.reduce<QuranPosition>((best, r) => {
    const edge = reviewDir === "ascending" ? r.start : r.end;
    const cmp = comparePositions(edge, best);
    return (reviewDir === "ascending" ? cmp < 0 : cmp > 0) ? edge : best;
  }, reviewDir === "ascending" ? excludedRanges[0].start : excludedRanges[0].end);

  // Try ayah 1 of the near-edge surah as the start line.
  const surahStart: QuranPosition = { surah: nearEdge.surah, ayah: 1 };
  if (!isExcluded(surahStart, excluded)) {
    return surahStart;
  }

  // Ayah 1 is excluded — step one past the furthest excluded edge.
  const furthest = excludedRanges.reduce<QuranPosition>((best, r) => {
    const edge = reviewDir === "ascending" ? r.end : r.start;
    const cmp = comparePositions(edge, best);
    return (reviewDir === "ascending" ? cmp > 0 : cmp < 0) ? edge : best;
  }, reviewDir === "ascending" ? excludedRanges[0].end : excludedRanges[0].start);

  const next = getNextAyah(furthest, reviewDir);
  if (!next) return furthest;

  // If next is in a new surah and its surah-start is clean, snap to it.
  if (next.surah !== furthest.surah) {
    const nextSurahStart: QuranPosition = { surah: next.surah, ayah: 1 };
    if (!isExcluded(nextSurahStart, excluded)) {
      return nextSurahStart;
    }
  }
  return next;
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

    // Find the next excluded zone boundary ahead of pos in the review direction
    let nextExcludedStart: QuranPosition | null = null;
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
        nextExcludedStart = null; // re-evaluate after skip
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
      const end = maybeSnapToSurahBoundary(rawEnd, reviewDir, snapThreshold);
      const blockEnd = reviewDir === "ascending"
        ? (comparePositions(end, cEnd) > 0 ? cEnd : end)
        : (comparePositions(end, cEnd) < 0 ? cEnd : end);
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
 * Major revision with a continuous, persistent cursor that cycles between the
 * dynamic start-line (just past the minor zone) and An-Nas 6 (or Al-Fatihah 1
 * for ascending memorization, which reviews downward).
 *
 * The cursor persists across assignments. On reaching the cycle-end, it wraps
 * back to the current start-line. If the growing minor zone ever swallows the
 * cursor, the cursor is pushed forward to the start-line.
 *
 * @param cursor          persistent cursor position (seeded from majRevStart on W1)
 * @param majRevPages     Y pages to cover this assignment
 * @param memDirection    student's memorization direction (review is opposite)
 * @param minorZoneRange  normalized Quran-order range of the minor zone (or null)
 * @param memRange        normalized Quran-order range of the current memorization (or null)
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
  const startLine = computeStartLine(minorZoneRange, memRange, reviewDir);
  const cEnd = cycleEnd(reviewDir);

  // Boundary check: if the cursor is behind the start-line (inside/before the
  // minor zone), push it forward to the start-line.
  let current = cursor;
  if (isBehindStartLine(current, startLine, reviewDir)) {
    current = startLine;
  }
  // If the cursor has run off the end of the cycle (sentinel from a previous
  // wrap), reset to the start-line.
  if (reviewDir === "ascending" && comparePositions(current, cEnd) > 0) {
    current = startLine;
  } else if (reviewDir === "descending" && comparePositions(current, cEnd) < 0) {
    current = startLine;
  }

  // Clean wrap: if the cursor is on the same page as the cycle end, any
  // pre-wrap block would be a micro-block (a few stranded ayahs like
  // "An-Nas 6 ← An-Nas 6"). Skip straight to the start-line so this
  // assignment renders a single clean block.
  const cursorPage = getAyahPage(current.surah, current.ayah);
  const cEndPage = getAyahPage(cEnd.surah, cEnd.ayah);
  if (cursorPage === cEndPage && comparePositions(current, cEnd) !== 0) {
    current = startLine;
  } else if (comparePositions(current, cEnd) === 0) {
    current = startLine;
  }

  const snapThreshold = computeSnapThreshold(majRevPages * LINES_PER_PAGE);
  const pagesAvailable = pageSpan(current, cEnd, reviewDir);
  const blocks: MajorBlockRange[] = [];
  let newCursor: QuranPosition;

  if (pagesAvailable >= majRevPages) {
    // Fits before the cycle end — single block.
    const rawEnd = advanceByPages(current, majRevPages, reviewDir);
    if (!rawEnd) return null;
    const end = maybeSnapToSurahBoundary(rawEnd, reviewDir, snapThreshold);
    blocks.push({ from: current, to: end });
    newCursor = getNextAyah(end, reviewDir) ?? end;
  } else {
    // Wrap: block 1 goes to cycle end, then block 2+ starts at startLine,
    // walking with gap-skips over any excluded zones.
    blocks.push({ from: current, to: cEnd });
    const remaining = majRevPages - pagesAvailable;

    if (remaining > 0) {
      const walked = walkWithSkips(
        startLine,
        remaining,
        reviewDir,
        [minorZoneRange, memRange],
        cEnd,
        snapThreshold
      );
      blocks.push(...walked.blocks);
      newCursor = walked.newCursor;
    } else {
      newCursor = startLine;
    }
  }

  return { blocks, newCursor };
}
