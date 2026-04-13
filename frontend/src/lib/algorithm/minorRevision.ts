import type { QuranPosition, PositionRange, Direction } from "@/lib/quran/types";
import { LINES_PER_PAGE } from "@/lib/quran/constants";
import { getSurahByNumber } from "@/lib/quran/surahs";
import { getAyahPage } from "@/lib/quran/ayahPages";
import { advanceByPages, comparePositions, normalizeRange } from "./helpers";

export interface MinorRevisionResult {
  /** Oldest-in-time position in the zone (start of review in reading order). */
  from: QuranPosition;
  /** Newest-in-time position (the frontier — end of review in reading order). */
  to: QuranPosition;
  /** Normalized Quran-order range (min/max) for overlap checks. */
  range: PositionRange;
}

/**
 * Volume-based rolling window: covers the last `minorRevPages` pages of memorized
 * material ending at the frontier, walking backward through memorization time.
 *
 * Memorization time order:
 *   - descending: surah N was memorized before surah N-1. Walking backward =
 *     going to higher surah numbers (toward memStart).
 *   - ascending: surah N was memorized before surah N+1. Walking backward =
 *     going to lower surah numbers (toward memStart).
 *
 * Within a surah, memorization always goes ayah 1 → last ayah, so walking
 * backward within a surah means going to lower ayah numbers.
 *
 * The page budget is measured in EXACT lines:
 *   pages × 15 lines. Each chunk's line count = its page span × 15.
 */
export function calculateMinorRevision(
  frontier: QuranPosition,
  minorRevPages: number,
  memStart: QuranPosition,
  memDirection: Direction
): MinorRevisionResult | null {
  if (minorRevPages <= 0) return null;

  let linesRemaining = minorRevPages * LINES_PER_PAGE;

  // Current chunk: from the start of the frontier's surah (or memStart.ayah if
  // same surah) up to the frontier.
  let curSurah = frontier.surah;
  let chunkEnd: QuranPosition = frontier;
  let oldest: QuranPosition = frontier;

  // Safety bound
  let safety = 120;
  while (linesRemaining > 0 && safety-- > 0) {
    const chunkStartAyah = curSurah === memStart.surah ? memStart.ayah : 1;
    const chunkStart: QuranPosition = { surah: curSurah, ayah: chunkStartAyah };

    const chunkStartPage = getAyahPage(chunkStart.surah, chunkStart.ayah);
    const chunkEndPage = getAyahPage(chunkEnd.surah, chunkEnd.ayah);
    const chunkLines = (chunkEndPage - chunkStartPage + 1) * LINES_PER_PAGE;

    if (chunkLines <= linesRemaining) {
      // Include the whole chunk
      linesRemaining -= chunkLines;
      oldest = chunkStart;

      // Reached memStart — no older memorized material.
      if (curSurah === memStart.surah) break;

      // Step backward in memorization time to the previous surah.
      // Descending mem: previous in time = higher surah number.
      // Ascending mem: previous in time = lower surah number.
      const nextSurah = memDirection === "descending" ? curSurah + 1 : curSurah - 1;
      if (nextSurah < 1 || nextSurah > 114) break;
      curSurah = nextSurah;
      const sInfo = getSurahByNumber(curSurah);
      chunkEnd = { surah: curSurah, ayah: sInfo.ayahCount };
    } else {
      // Partial chunk: use the remaining budget to walk backward within this chunk.
      const pagesRemaining = linesRemaining / LINES_PER_PAGE;
      // Walk backward from chunkEnd by pagesRemaining pages (descending in page order)
      const partial = advanceByPages(chunkEnd, pagesRemaining, "descending");
      if (partial) {
        const actualPartial =
          comparePositions(partial, chunkStart) < 0 ? chunkStart : partial;
        oldest = actualPartial;
      }
      break;
    }
  }

  return {
    from: oldest,
    to: frontier,
    range: normalizeRange(oldest, frontier),
  };
}
