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
