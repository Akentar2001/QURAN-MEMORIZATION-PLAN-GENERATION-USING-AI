import type { QuranPosition, Direction, PositionRange } from "@/lib/quran/types";
import { walkByWeight, getNextVerseEntry, normalizeRange } from "./helpers";

export interface NewMemorizationResult {
  from: QuranPosition;
  to: QuranPosition;
  range: PositionRange;
  newCursor: QuranPosition;
  frontier: QuranPosition;
  pagesUsed: number;
}

export function calculateNewMemorization(
  cursor: QuranPosition,
  pagesPerSession: number,
  direction: Direction,
  cumulativeActual: number,
  sessionNumber: number
): NewMemorizationResult | null {
  if (pagesPerSession <= 0) return null;

  const cumulativeTarget = sessionNumber * pagesPerSession;
  const todaysBudget = cumulativeTarget - cumulativeActual;
  if (todaysBudget <= 0) return null;

  const walked = walkByWeight(cursor, todaysBudget, direction);
  if (walked.pagesUsed <= 0) return null;

  const from = walked.from;
  const to = walked.to;

  const nextEntry = getNextVerseEntry(to, direction);
  const newCursor: QuranPosition = nextEntry
    ? { surah: nextEntry.surahId, ayah: nextEntry.ayah }
    : to;

  const range = normalizeRange(from, to);

  return { from, to, range, newCursor, frontier: to, pagesUsed: walked.pagesUsed };
}
