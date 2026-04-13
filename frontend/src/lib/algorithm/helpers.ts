import type { QuranPosition, PositionRange, Direction } from "@/lib/quran/types";
import { TOTAL_SURAHS } from "@/lib/quran/constants";
import { getSurahByNumber, SURAHS } from "@/lib/quran/surahs";
import { getAyahPage, getPageStartAyah, getAyahsOnPage, getPageEndAyah } from "@/lib/quran/ayahPages";

/**
 * Compare two Quran positions.
 * Returns -1 if a comes before b, 0 if equal, 1 if a comes after b.
 * Order: (1,1) < (1,7) < (2,1) < (114,6)
 */
export function comparePositions(a: QuranPosition, b: QuranPosition): -1 | 0 | 1 {
  if (a.surah !== b.surah) {
    return a.surah < b.surah ? -1 : 1;
  }
  if (a.ayah !== b.ayah) {
    return a.ayah < b.ayah ? -1 : 1;
  }
  return 0;
}

/**
 * Get the next ayah in the given direction, crossing surah boundaries.
 * Returns null if at the boundary of the Quran.
 */
export function getNextAyah(pos: QuranPosition, direction: Direction): QuranPosition | null {
  const surah = getSurahByNumber(pos.surah);

  if (direction === "ascending") {
    if (pos.ayah < surah.ayahCount) {
      return { surah: pos.surah, ayah: pos.ayah + 1 };
    }
    if (pos.surah < TOTAL_SURAHS) {
      return { surah: pos.surah + 1, ayah: 1 };
    }
    return null;
  } else {
    if (pos.ayah > 1) {
      return { surah: pos.surah, ayah: pos.ayah - 1 };
    }
    if (pos.surah > 1) {
      const prevSurah = getSurahByNumber(pos.surah - 1);
      return { surah: pos.surah - 1, ayah: prevSurah.ayahCount };
    }
    return null;
  }
}

/**
 * Check if a position is within a range (inclusive).
 * The range is always stored with start <= end in Quran order.
 */
export function isPositionInRange(pos: QuranPosition, range: PositionRange): boolean {
  return comparePositions(pos, range.start) >= 0 && comparePositions(pos, range.end) <= 0;
}

const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

/**
 * Convert a number to Arabic (Eastern) numerals.
 */
export function toArabicNumerals(n: number): string {
  return String(n)
    .split("")
    .map((d) => ARABIC_DIGITS[parseInt(d, 10)])
    .join("");
}

/**
 * Format a QuranPosition as "سورة_عربي آية_عربي".
 */
export function formatPosition(pos: QuranPosition): string {
  const surah = getSurahByNumber(pos.surah);
  return `${surah.nameArabic} ${toArabicNumerals(pos.ayah)}`;
}

/**
 * Advance from a start position by a given number of pages in the specified direction.
 * Returns the ending position (the last ayah covered).
 *
 * For ascending: returns a position HIGHER in Quran order (last ayah on the end page).
 * For descending: returns a position LOWER in Quran order (first ayah on the end page).
 *
 * N pages means covering N pages of content, NOT advancing N page numbers.
 * Starting on page X, covering 1 page means content on page X only.
 * Covering 2 pages means pages X and X+1 (ascending) or X and X-1 (descending).
 */
export function advanceByPages(
  start: QuranPosition,
  pages: number,
  direction: Direction
): QuranPosition | null {
  if (pages <= 0) return start;

  const startPage = getAyahPage(start.surah, start.ayah);
  const wholePages = Math.floor(pages);
  const fraction = pages - wholePages;

  if (direction === "ascending") {
    // Cover pages: startPage, startPage+1, ..., startPage+wholePages-1
    // Plus fractional part on the next page if any
    const lastFullPage = Math.min(604, startPage + wholePages - 1);

    if (fraction < 0.001) {
      // Exact whole pages
      return getPageEndAyah(lastFullPage);
    }

    // Fractional: cover full pages + fraction of the next page
    const partialPage = lastFullPage + 1;
    if (partialPage > 604) {
      return { surah: 114, ayah: SURAHS[113].ayahCount };
    }
    const ayahsOnPartialPage = getAyahsOnPage(partialPage);
    if (ayahsOnPartialPage.length === 0) {
      return getPageEndAyah(lastFullPage);
    }

    // When wholePages === 0 the partial page IS the start page.
    // We must advance relative to the start ayah's offset within the page,
    // not from the page's beginning — otherwise we can land before the cursor.
    // If advancing overflows the start page, spill onto the next page.
    if (wholePages === 0) {
      const startIdxOnPage = ayahsOnPartialPage.findIndex(
        (p) => p.surah === start.surah && p.ayah === start.ayah
      );
      const offsetFromStart = startIdxOnPage >= 0 ? startIdxOnPage : 0;
      const advance = Math.max(1, Math.round(fraction * ayahsOnPartialPage.length));
      const targetIdx = offsetFromStart + advance - 1;
      if (targetIdx < ayahsOnPartialPage.length) {
        return ayahsOnPartialPage[targetIdx];
      }
      // Overflow: we used up the rest of the start page — spill into the next page.
      const overflow = targetIdx - (ayahsOnPartialPage.length - 1);
      const nextPage = partialPage + 1;
      if (nextPage > 604) return { surah: 114, ayah: SURAHS[113].ayahCount };
      const ayahsOnNextPage = getAyahsOnPage(nextPage);
      if (ayahsOnNextPage.length === 0) return getPageEndAyah(partialPage);
      const nextIdx = Math.min(ayahsOnNextPage.length - 1, overflow - 1);
      return ayahsOnNextPage[nextIdx];
    }

    const idx = Math.max(0, Math.round(fraction * ayahsOnPartialPage.length) - 1);
    return ayahsOnPartialPage[idx];
  } else {
    // Descending: cover pages startPage, startPage-1, ..., startPage-wholePages+1
    const lastFullPage = Math.max(1, startPage - wholePages + 1);

    if (fraction < 0.001) {
      // Exact whole pages — return first ayah on the lowest page covered
      return getPageStartAyah(lastFullPage);
    }

    // Fractional: cover full pages + fraction of the page below
    const partialPage = lastFullPage - 1;
    if (partialPage < 1) {
      return { surah: 1, ayah: 1 };
    }
    const ayahsOnPartialPage = getAyahsOnPage(partialPage);
    if (ayahsOnPartialPage.length === 0) {
      return getPageStartAyah(lastFullPage);
    }

    // When wholePages === 0 the partial page IS the start page.
    // We must advance relative to the start ayah's offset, going backward.
    if (wholePages === 0) {
      const startIdxOnPage = ayahsOnPartialPage.findIndex(
        (p) => p.surah === start.surah && p.ayah === start.ayah
      );
      const offsetFromEnd = startIdxOnPage >= 0
        ? ayahsOnPartialPage.length - 1 - startIdxOnPage
        : 0;
      const advance = Math.max(1, Math.round(fraction * ayahsOnPartialPage.length));
      const fromEnd = offsetFromEnd + advance;
      const targetIdx = Math.max(0, ayahsOnPartialPage.length - fromEnd - 1);
      return ayahsOnPartialPage[targetIdx];
    }

    // From the end of the page, pick the fraction point
    const fromEnd = Math.round(fraction * ayahsOnPartialPage.length);
    const idx = Math.max(0, ayahsOnPartialPage.length - fromEnd);
    return ayahsOnPartialPage[idx];
  }
}

/**
 * Create a normalized PositionRange where start <= end in Quran order,
 * regardless of the direction of memorization.
 */
export function normalizeRange(a: QuranPosition, b: QuranPosition): PositionRange {
  if (comparePositions(a, b) <= 0) {
    return { start: a, end: b };
  }
  return { start: b, end: a };
}

/**
 * Compute the snap threshold in lines for a session budget, capped to [6, 10]
 * or 15% of the budget — whichever the user would reasonably tolerate as "a
 * few extra ayahs to finish the surah".
 */
export function computeSnapThreshold(budgetLines: number): number {
  return Math.min(10, Math.max(6, Math.floor(budgetLines * 0.15)));
}

/**
 * If a stop position is within `thresholdAyahs` of a surah boundary in the
 * reading direction and the boundary is on the same or next page, extend the
 * stop to the surah boundary. Returns the possibly-extended position.
 *
 * - ascending: snaps forward to the last ayah of the surah
 * - descending: snaps backward to ayah 1 of the surah
 */
export function maybeSnapToSurahBoundary(
  stopPos: QuranPosition,
  readDir: Direction,
  thresholdAyahs: number
): QuranPosition {
  const surah = getSurahByNumber(stopPos.surah);

  if (readDir === "ascending") {
    if (stopPos.ayah >= surah.ayahCount) return stopPos;
    const remaining = surah.ayahCount - stopPos.ayah;
    if (remaining > thresholdAyahs) return stopPos;
    const stopPage = getAyahPage(stopPos.surah, stopPos.ayah);
    const endPage = getAyahPage(stopPos.surah, surah.ayahCount);
    if (endPage - stopPage > 1) return stopPos;
    return { surah: stopPos.surah, ayah: surah.ayahCount };
  }

  if (stopPos.ayah <= 1) return stopPos;
  const before = stopPos.ayah - 1;
  if (before > thresholdAyahs) return stopPos;
  const stopPage = getAyahPage(stopPos.surah, stopPos.ayah);
  const startPage = getAyahPage(stopPos.surah, 1);
  if (stopPage - startPage > 1) return stopPos;
  return { surah: stopPos.surah, ayah: 1 };
}

/**
 * Format a range as a clean display pair: if `from` is ayah 1 and `to` is the
 * last ayah of the same surah, both fields become the surah name alone. The UI
 * can detect `from === to` and render a single label.
 */
export function formatRangeClean(
  from: QuranPosition,
  to: QuranPosition
): { from: string; to: string } {
  if (from.surah === to.surah) {
    const surah = getSurahByNumber(from.surah);
    if (from.ayah === 1 && to.ayah === surah.ayahCount) {
      return { from: surah.nameArabic, to: surah.nameArabic };
    }
  }
  return { from: formatPosition(from), to: formatPosition(to) };
}
