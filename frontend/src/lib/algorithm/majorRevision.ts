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
 * Check if a position is past the end of the Quran in a given direction.
 */
function isPastEnd(pos: QuranPosition, direction: Direction): boolean {
  if (direction === "ascending") {
    const lastSurah = getSurahByNumber(TOTAL_SURAHS);
    return pos.surah > TOTAL_SURAHS ||
      (pos.surah === TOTAL_SURAHS && pos.ayah > lastSurah.ayahCount);
  } else {
    return pos.surah < 1 || (pos.surah === 1 && pos.ayah < 1);
  }
}

/**
 * Calculate the major revision section for one assignment.
 *
 * Major revision moves in the OPPOSITE direction to memorization.
 * It skips any ayahs that overlap with the CURRENT assignment's memorization
 * or minor revision ranges.
 *
 * When reaching a Quran boundary (end for ascending major, start for descending),
 * it wraps around to the user's memStartSurah (the starting point of memorization),
 * treating major review as a cycle around the student's memorized content.
 *
 * @param cursor - The major revision cursor (where to start)
 * @param majRevPages - Number of pages for major revision
 * @param memDirection - The memorization direction (major goes OPPOSITE)
 * @param currentMemRange - THIS assignment's new memorization range
 * @param minorRange - THIS assignment's minor revision range (null if none)
 * @param memStartSurah - The initial memorization start surah (used as wraparound point)
 * @param memStartAyah - The initial memorization start ayah
 */
export function calculateMajorRevision(
  cursor: QuranPosition,
  majRevPages: number,
  memDirection: Direction,
  currentMemRange: PositionRange | null,
  minorRange: PositionRange | null,
  memStartSurah: number,
  memStartAyah: number
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

  // Check if cursor is past the end of Quran in major direction — wraparound needed
  let startPos: QuranPosition | null;

  if (isPastEnd(cursor, majDirection)) {
    // Wraparound: restart from memStartSurah
    const wrapStart: QuranPosition = { surah: memStartSurah, ayah: memStartAyah };
    startPos = findFirstFreePosition(wrapStart, majDirection, exclusionRanges);
  } else {
    // Find the first free position starting from cursor
    startPos = findFirstFreePosition(cursor, majDirection, exclusionRanges);

    // If cursor search returns null (hit boundary), wraparound to memStartSurah
    if (startPos === null) {
      const wrapStart: QuranPosition = { surah: memStartSurah, ayah: memStartAyah };
      startPos = findFirstFreePosition(wrapStart, majDirection, exclusionRanges);
    }
  }

  if (startPos === null) {
    return null; // No free material anywhere
  }

  // Advance by majRevPages from the free start position
  const endPos = advanceByPages(startPos, majRevPages, majDirection);
  if (endPos === null) {
    return null;
  }

  // Normalized range
  const range = normalizeRange(startPos, endPos);

  // New cursor: one ayah past endPos in the major direction
  let newCursor = getNextAyah(endPos, majDirection);

  if (newCursor === null) {
    // Reached boundary — signal wraparound by setting cursor past the end
    // The next call will detect this and wrap to memStartSurah
    newCursor = majDirection === "ascending"
      ? { surah: TOTAL_SURAHS + 1, ayah: 1 } // sentinel: past the end
      : { surah: 0, ayah: 0 }; // sentinel: past the start
  }

  return {
    from: startPos,
    to: endPos,
    range,
    newCursor,
  };
}
