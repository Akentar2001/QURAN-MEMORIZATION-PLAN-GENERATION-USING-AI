import type { QuranPosition, PositionRange } from "@/lib/quran/types";
import { getAyahPage } from "@/lib/quran/ayahPages";
import { comparePositions } from "./helpers";

/**
 * Calculate how many pages a range covers.
 */
function calculateSessionPages(range: PositionRange): number {
  const startPage = getAyahPage(range.start.surah, range.start.ayah);
  const endPage = getAyahPage(range.end.surah, range.end.ayah);
  return endPage - startPage + 1;
}

export interface MinorRevisionResult {
  from: QuranPosition;
  to: QuranPosition;
  range: PositionRange;
}

/**
 * Calculate the minor revision as a rolling window over previous memorization sessions.
 *
 * Starts with the most recent session (previous assignment's memorization)
 * and adds older sessions backward until reaching the target page count
 * (with closest-fit at the boundary).
 *
 * Display format:
 *   from = first ayah of the chronologically oldest included session
 *   to   = last ayah of the chronologically latest included session
 *
 * For ascending memorization: from < to in Quran order (natural)
 * For descending memorization across surah boundaries: from > to in Quran order
 * (matches the student's direction of progression)
 *
 * @param previousSessions - Previous memorization ranges in chronological order (oldest first)
 * @param minorRevPages - Target number of pages
 * @returns Minor revision result, or null if no previous sessions
 */
export function calculateMinorRevision(
  previousSessions: PositionRange[],
  minorRevPages: number
): MinorRevisionResult | null {
  if (previousSessions.length === 0 || minorRevPages <= 0) {
    return null;
  }

  // Reverse to work from latest backward
  const sessions = [...previousSessions].reverse();
  const latest = sessions[0];

  let totalPages = calculateSessionPages(latest);
  const included: PositionRange[] = [latest];

  // Add older sessions until reaching minorRevPages (closest-fit)
  for (let i = 1; i < sessions.length; i++) {
    const session = sessions[i];
    const sessionPages = calculateSessionPages(session);
    const potentialTotal = totalPages + sessionPages;

    if (potentialTotal > minorRevPages) {
      // Closest-fit check: is the current total closer or is adding this closer?
      const diffWith = Math.abs(potentialTotal - minorRevPages);
      const diffWithout = Math.abs(minorRevPages - totalPages);
      if (diffWithout < diffWith) break;
    }

    included.push(session);
    totalPages = potentialTotal;

    if (totalPages >= minorRevPages) break;
  }

  // included[0] = latest chronologically, included[last] = oldest chronologically
  const chronoLatest = included[0];
  const chronoOldest = included[included.length - 1];

  // Display: from = start of chronologically oldest, to = end of chronologically latest
  const from = chronoOldest.start;
  const to = chronoLatest.end;

  // Normalized range (union of all included) for overlap checks
  let minPos = included[0].start;
  let maxPos = included[0].end;
  for (const r of included) {
    if (comparePositions(r.start, minPos) < 0) minPos = r.start;
    if (comparePositions(r.end, maxPos) > 0) maxPos = r.end;
  }

  return {
    from,
    to,
    range: { start: minPos, end: maxPos },
  };
}
