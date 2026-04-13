import type { QuranPosition, Direction, PositionRange } from "@/lib/quran/types";
import { LINES_PER_PAGE } from "@/lib/quran/constants";
import {
  getNextAyah,
  normalizeRange,
  advanceByPages,
  computeSnapThreshold,
  maybeSnapToSurahBoundary,
  comparePositions,
} from "./helpers";
import { getAyahPage } from "@/lib/quran/ayahPages";
import { getSurahByNumber } from "@/lib/quran/surahs";

export interface NewMemorizationResult {
  from: QuranPosition;
  to: QuranPosition;
  range: PositionRange;
  newCursor: QuranPosition;
  /** The chronologically last ayah memorized in this session (reading-time order). */
  frontier: QuranPosition;
}

/**
 * Calculate how many pages of content a range covers.
 */
function pagesInRange(start: QuranPosition, end: QuranPosition): number {
  const startPage = getAyahPage(start.surah, start.ayah);
  const endPage = getAyahPage(end.surah, end.ayah);
  return endPage - startPage + 1;
}

/**
 * Calculate the new memorization section for one assignment.
 *
 * The student always reads FORWARD within each surah (ayah 1 → last ayah).
 * The "direction" determines which surah they go to NEXT:
 *   - ascending: after surah N, go to surah N+1
 *   - descending: after surah N, go to surah N-1
 *
 * From/to are always in ascending Quran order (from <= to).
 */
export function calculateNewMemorization(
  cursor: QuranPosition,
  linesPerSession: number,
  direction: Direction
): NewMemorizationResult | null {
  const targetPages = linesPerSession / LINES_PER_PAGE;
  let pagesConsumed = 0;

  // Track the memorized range boundaries
  let rangeLowest: QuranPosition = { ...cursor };
  let rangeHighest: QuranPosition = { ...cursor };
  let lastPos: QuranPosition = { ...cursor };

  let currentSurah = cursor.surah;
  let currentAyah = cursor.ayah;

  while (pagesConsumed < targetPages) {
    const surah = getSurahByNumber(currentSurah);

    // How many pages from currentAyah to end of this surah?
    const startPage = getAyahPage(currentSurah, currentAyah);
    const endPage = getAyahPage(currentSurah, surah.ayahCount);
    const surahPagesRemaining = endPage - startPage + 1;

    const budgetRemaining = targetPages - pagesConsumed;

    if (surahPagesRemaining <= budgetRemaining) {
      // Entire (remaining) surah fits within budget
      pagesConsumed += surahPagesRemaining;
      const surahEnd = { surah: currentSurah, ayah: surah.ayahCount };
      const surahStart = { surah: currentSurah, ayah: currentAyah };

      // Update range
      if (currentSurah < rangeLowest.surah || (currentSurah === rangeLowest.surah && currentAyah < rangeLowest.ayah)) {
        rangeLowest = surahStart;
      }
      if (currentSurah > rangeHighest.surah || (currentSurah === rangeHighest.surah && surah.ayahCount > rangeHighest.ayah)) {
        rangeHighest = surahEnd;
      }
      lastPos = surahEnd;

      // Move to next surah in the specified direction
      if (direction === "ascending") {
        if (currentSurah >= 114) break;
        currentSurah++;
        currentAyah = 1;
      } else {
        if (currentSurah <= 1) break;
        currentSurah--;
        currentAyah = 1;
      }
    } else {
      // Partial surah — advance within this surah by remaining budget
      const partialEnd = advanceByPages(
        { surah: currentSurah, ayah: currentAyah },
        budgetRemaining,
        "ascending" // always read forward within surah
      );

      if (partialEnd) {
        // Smart snapping: if we'd leave only a few ayahs before the end of
        // this surah, finish the surah instead of splitting it across days.
        const snapThreshold = computeSnapThreshold(linesPerSession);
        const snapped = maybeSnapToSurahBoundary(partialEnd, "ascending", snapThreshold);
        const didSnap = comparePositions(snapped, partialEnd) !== 0;

        const partialStart = { surah: currentSurah, ayah: currentAyah };
        if (currentSurah < rangeLowest.surah || (currentSurah === rangeLowest.surah && currentAyah < rangeLowest.ayah)) {
          rangeLowest = partialStart;
        }
        if (snapped.surah > rangeHighest.surah || (snapped.surah === rangeHighest.surah && snapped.ayah > rangeHighest.ayah)) {
          rangeHighest = snapped;
        }
        lastPos = snapped;

        if (didSnap) {
          // We've finished the current surah — mimic the whole-surah branch
          // so that newCursor advances into the next surah in reading order.
          if (direction === "ascending") {
            if (currentSurah < 114) {
              currentSurah++;
              currentAyah = 1;
            }
          } else if (currentSurah > 1) {
            currentSurah--;
            currentAyah = 1;
          }
        }
      }
      break;
    }
  }

  // Build the range (always normalized: start <= end)
  const range = normalizeRange(rangeLowest, rangeHighest);

  // from/to for display: always in ascending Quran order
  const from = range.start;
  const to = range.end;

  // newCursor: next position to start memorizing in the next assignment
  let newCursor: QuranPosition;

  if (direction === "ascending") {
    // Continue forward from where we stopped
    newCursor = getNextAyah(lastPos, "ascending") ?? lastPos;
  } else {
    // Descending: if we finished a surah, continue at the start of the next lower surah
    const lastSurah = getSurahByNumber(lastPos.surah);
    if (lastPos.ayah === lastSurah.ayahCount) {
      // Finished the surah — next cursor is the start of the next lower surah
      if (lastPos.surah > 1) {
        // The loop already advanced currentSurah to the next lower one
        newCursor = { surah: currentSurah, ayah: 1 };
      } else {
        newCursor = lastPos;
      }
    } else {
      // Stopped mid-surah — continue from next ayah (still forward)
      newCursor = getNextAyah(lastPos, "ascending") ?? lastPos;
    }
  }

  return { from, to, range, newCursor, frontier: lastPos };
}
