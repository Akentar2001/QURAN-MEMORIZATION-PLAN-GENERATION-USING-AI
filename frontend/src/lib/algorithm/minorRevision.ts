import type { QuranPosition, PositionRange, Direction } from "@/lib/quran/types";
import { advanceByPages, getNextAyah, normalizeRange } from "./helpers";

/**
 * Calculate the minor revision section for one assignment.
 *
 * Minor revision covers recently memorized material adjacent to the current
 * memorization start, going in the OPPOSITE direction (into already-memorized territory).
 *
 * For descending memorization: minor revision goes ASCENDING from memStart
 *   (reviewing the surahs the student already memorized above the current position)
 * For ascending memorization: minor revision goes DESCENDING from memStart
 *
 * @param memStart - Where memorization started FOR THIS ASSIGNMENT (the cursor before advancing)
 * @param minorRevPages - Number of pages for minor revision
 * @param direction - The memorization direction (minor goes OPPOSITE)
 * @param assignmentNumber - Current assignment number (1-30)
 * @returns Display from/to + normalized range, or null for assignment 1
 */
export function calculateMinorRevision(
  memStart: QuranPosition,
  minorRevPages: number,
  direction: Direction,
  assignmentNumber: number
): { from: QuranPosition; to: QuranPosition; range: PositionRange } | null {
  // Assignment 1: no material to revise yet
  if (assignmentNumber <= 1) {
    return null;
  }

  if (minorRevPages <= 0) {
    return null;
  }

  // Minor revision goes in the OPPOSITE direction of memorization
  // into already-memorized territory
  const revDirection: Direction = direction === "ascending" ? "descending" : "ascending";

  // Start from the ayah adjacent to memStart in the opposite direction
  const revStart = getNextAyah(memStart, revDirection);
  if (revStart === null) {
    return null;
  }

  // Advance by minorRevPages in the revision direction
  const revEnd = advanceByPages(revStart, minorRevPages, revDirection);
  if (revEnd === null) {
    return null;
  }

  // Normalized range for overlap checks
  const range = normalizeRange(revStart, revEnd);

  // Display: for descending memorization, minor goes ascending (higher surahs)
  // from = revStart (adjacent to mem), to = revEnd (further into memorized territory)
  return { from: revStart, to: revEnd, range };
}
