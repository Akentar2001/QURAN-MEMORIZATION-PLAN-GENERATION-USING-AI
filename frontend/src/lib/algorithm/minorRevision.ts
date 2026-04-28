import type { QuranPosition, PositionRange } from "@/lib/quran/types";
import { normalizeRange } from "./helpers";

export interface MemoSession {
  start: QuranPosition;
  end: QuranPosition;
  pages: number;
}

export interface MinorRevisionResult {
  from: QuranPosition;
  to: QuranPosition;
  range: PositionRange;
}

/**
 * Minor revision: replays whole previous-day memorization sessions, most-recent
 * first. Mirrors the Python backend's `generate_minor_revision_plan` (pages
 * mode): always includes the latest session, then greedily adds older sessions
 * one at a time as long as adding gets the running total CLOSER to the target.
 *
 * Output range: from = oldest included session's start verse, to = latest
 * session's end verse. Returns null when there are no past sessions or budget
 * is non-positive.
 */
export function calculateMinorRevision(
  pastSessions: MemoSession[],
  requiredPages: number
): MinorRevisionResult | null {
  if (pastSessions.length === 0 || requiredPages <= 0) return null;

  const latest = pastSessions[0];
  let total = latest.pages;
  let oldestStart: QuranPosition = latest.start;

  for (let i = 1; i < pastSessions.length; i++) {
    const session = pastSessions[i];
    const potential = total + session.pages;
    const diffWith = Math.abs(potential - requiredPages);
    const diffWithout = Math.abs(requiredPages - total);
    if (diffWithout < diffWith) break;
    total = potential;
    oldestStart = session.start;
  }

  return {
    from: oldestStart,
    to: latest.end,
    range: normalizeRange(oldestStart, latest.end),
  };
}
