import type { QuranPosition, Direction } from "@/lib/quran/types";
import { TOTAL_SURAHS } from "@/lib/quran/constants";
import { BY_POSITION } from "@/lib/quran/verseData";
import { getNextAyah, walkByWeight } from "./helpers";

export interface MajorBlockRange {
  from: QuranPosition;
  to: QuranPosition;
}

export interface MajorRevisionResult {
  blocks: MajorBlockRange[];
  /**
   * The position to read from on the next call, or null when the walker
   * exhausted the Quran in the review direction. A null cursor signals the
   * next call to wrap by teleporting past today's wall surah.
   */
  newCursor: QuranPosition | null;
}

/**
 * Major revision: walk forward in review direction from the persistent cursor,
 * stopping at a single hard wall = today's "active" surah (the surah where
 * today's minor revision begins, or — if no minor — where today's new
 * memorization begins). Mirrors the Python backend's `_generate_major_revision`
 * + `generate_plan_by_amount(stop_place=...)` flow.
 *
 * Wall priority: minor takes precedence over memo. If neither is provided,
 * the walker has no wall and just consumes its budget freely.
 *
 * Cursor reset (teleport): if the cursor is invalid (past end of Quran) OR
 * its surah equals the wall surah, the cursor jumps to ayah 1 of the surah
 * immediately past the wall in the review direction. Out-of-range teleport
 * (would land outside [1, TOTAL_SURAHS]) yields no plan for the day.
 *
 * @param cursor             next position to read (advanced after each call)
 * @param majRevPages        page budget for the day
 * @param memDirection       student's memorization direction (review = opposite)
 * @param minorActiveSurah   surah of `minorResult.from` (oldest minor surah), or null
 * @param memoActiveSurah    surah of `memResult.from` (today's memo start surah), or null
 */
export function calculateMajorRevision(
  cursor: QuranPosition | null,
  majRevPages: number,
  memDirection: Direction,
  minorActiveSurah: number | null,
  memoActiveSurah: number | null
): MajorRevisionResult | null {
  if (majRevPages <= 0) return null;

  const reviewDir: Direction =
    memDirection === "descending" ? "ascending" : "descending";

  // Minor wall takes priority over memo wall (matches Python's if/elif).
  const wallSurah = minorActiveSurah ?? memoActiveSurah ?? 0;

  let startVerse: QuranPosition | null = cursor;
  if (cursor && !BY_POSITION[cursor.surah]?.[cursor.ayah]) {
    startVerse = null;
  }

  if (wallSurah > 0 && (startVerse === null || startVerse.surah === wallSurah)) {
    const target = reviewDir === "ascending" ? wallSurah + 1 : wallSurah - 1;
    if (target < 1 || target > TOTAL_SURAHS) return null;
    startVerse = { surah: target, ayah: 1 };
  }

  if (!startVerse) return null;

  const walked = walkByWeight(
    startVerse,
    majRevPages,
    reviewDir,
    wallSurah > 0 ? wallSurah : undefined
  );

  if (walked.pagesUsed === 0) return null;

  // null newCursor signals "exhausted, wrap on next call" — caller will pass
  // it back in and the wallSurah teleport will rewind to active_surah ± 1.
  const newCursor = getNextAyah(walked.to, reviewDir);

  return {
    blocks: [{ from: walked.from, to: walked.to }],
    newCursor,
  };
}
