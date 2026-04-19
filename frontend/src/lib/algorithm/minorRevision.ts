import type { QuranPosition, PositionRange, Direction } from "@/lib/quran/types";
import { walkByWeight, normalizeRange } from "./helpers";

export interface MinorRevisionResult {
  from: QuranPosition;
  to: QuranPosition;
  range: PositionRange;
}

/**
 * Walk BACKWARD from the frontier to find the minor revision zone.
 * "Backward through memorization time" = toward older material:
 * - descending mem (newer = lower surah): older = higher surah → walk ascending
 * - ascending mem (newer = higher surah): older = lower surah → walk descending
 */
export function calculateMinorRevision(
  frontier: QuranPosition | null,
  minorRevPages: number,
  memStart: QuranPosition,
  memDirection: Direction
): MinorRevisionResult | null {
  if (!frontier || minorRevPages <= 0) return null;

  const walkDir: Direction = memDirection === "descending" ? "ascending" : "descending";
  const stopPlace = memStart.surah;

  const walked = walkByWeight(frontier, minorRevPages, walkDir, stopPlace);

  const olderEnd = walked.to;
  const newerEnd = frontier;

  return {
    from: olderEnd,
    to: newerEnd,
    range: normalizeRange(olderEnd, newerEnd),
  };
}
