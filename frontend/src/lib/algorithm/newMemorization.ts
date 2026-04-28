import type { QuranPosition, Direction, PositionRange } from "@/lib/quran/types";
import { LINES_PER_PAGE } from "@/lib/quran/constants";
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
  linesPerSession: number,
  direction: Direction
): NewMemorizationResult | null {
  if (linesPerSession <= 0) return null;

  const pageBudget = linesPerSession / LINES_PER_PAGE;
  const walked = walkByWeight(cursor, pageBudget, direction);

  const from = walked.from;
  const to = walked.to;

  const nextEntry = getNextVerseEntry(to, direction);
  const newCursor: QuranPosition = nextEntry
    ? { surah: nextEntry.surahId, ayah: nextEntry.ayah }
    : to;

  const range = normalizeRange(from, to);

  return { from, to, range, newCursor, frontier: to, pagesUsed: walked.pagesUsed };
}
