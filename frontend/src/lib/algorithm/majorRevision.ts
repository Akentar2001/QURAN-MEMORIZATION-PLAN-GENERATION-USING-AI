import type { QuranPosition, PositionRange, Direction } from "@/lib/quran/types";
import { TOTAL_SURAHS } from "@/lib/quran/constants";
import { getSurahByNumber } from "@/lib/quran/surahs";
import {
  advanceByPages,
  comparePositions,
  getNextAyah,
  isPositionInRange,
  normalizeRange,
} from "./helpers";

export interface MajorRevisionResult {
  from: QuranPosition;
  to: QuranPosition;
  range: PositionRange;
  newCursor: QuranPosition;
}

/**
 * Find the first position that is NOT inside any of the exclusion ranges,
 * starting from `pos` and moving in `searchDirection`.
 */
function findFirstFreePosition(
  pos: QuranPosition,
  searchDirection: Direction,
  exclusionRanges: PositionRange[]
): QuranPosition | null {
  let current: QuranPosition | null = pos;
  let iterations = 0;
  const MAX_ITERATIONS = 7000;

  while (current !== null && iterations < MAX_ITERATIONS) {
    const inExclusion = exclusionRanges.some(
      (range) => isPositionInRange(current!, range)
    );
    if (!inExclusion) {
      return current;
    }
    current = getNextAyah(current, searchDirection);
    iterations++;
  }

  return null;
}

/**
 * Calculate the major revision section for one assignment.
 *
 * Major revision moves in the OPPOSITE direction to memorization.
 * It skips any ayahs that overlap with the CURRENT ASSIGNMENT's memorization
 * or minor revision ranges (not the entire accumulated memorized range).
 *
 * When reaching a Quran boundary, it wraps around and restarts from the
 * first free position outside the exclusion ranges.
 *
 * @param cursor - The major revision cursor (where to start)
 * @param majRevPages - Number of pages for major revision
 * @param memDirection - The memorization direction (major goes OPPOSITE)
 * @param currentMemRange - THIS assignment's new memorization range (not accumulated!)
 * @param minorRange - THIS assignment's minor revision range (null if none)
 */
export function calculateMajorRevision(
  cursor: QuranPosition,
  majRevPages: number,
  memDirection: Direction,
  currentMemRange: PositionRange | null,
  minorRange: PositionRange | null
): MajorRevisionResult | null {
  if (majRevPages <= 0) {
    return null;
  }

  // Major revision direction is OPPOSITE to memorization direction
  const majDirection: Direction =
    memDirection === "ascending" ? "descending" : "ascending";

  // Build exclusion ranges from CURRENT assignment only
  const exclusionRanges: PositionRange[] = [];
  if (currentMemRange) exclusionRanges.push(currentMemRange);
  if (minorRange) exclusionRanges.push(minorRange);

  // Find the first free position starting from cursor
  let startPos = findFirstFreePosition(cursor, majDirection, exclusionRanges);

  // If not found, try wrapping around from the other end
  if (startPos === null) {
    const wrapStart: QuranPosition =
      majDirection === "ascending"
        ? { surah: 1, ayah: 1 }
        : { surah: TOTAL_SURAHS, ayah: getSurahByNumber(TOTAL_SURAHS).ayahCount };

    startPos = findFirstFreePosition(wrapStart, majDirection, exclusionRanges);
    if (startPos === null) {
      return null; // No free material anywhere
    }
  }

  // Advance by majRevPages from the free start position
  const endPos = advanceByPages(startPos, majRevPages, majDirection);
  if (endPos === null) {
    return null;
  }

  // Normalized range for consistency
  const range = normalizeRange(startPos, endPos);

  // New cursor: one ayah past endPos in the major direction
  let newCursor = getNextAyah(endPos, majDirection);

  if (newCursor === null) {
    // Reached boundary — wrap around for next time
    newCursor =
      majDirection === "ascending"
        ? { surah: 1, ayah: 1 }
        : { surah: TOTAL_SURAHS, ayah: getSurahByNumber(TOTAL_SURAHS).ayahCount };
  }

  return {
    from: startPos,
    to: endPos,
    range,
    newCursor,
  };
}
