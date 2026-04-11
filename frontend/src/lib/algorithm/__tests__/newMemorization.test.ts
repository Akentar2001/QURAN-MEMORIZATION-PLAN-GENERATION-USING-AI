import { describe, it, expect } from "vitest";
import { calculateNewMemorization } from "../newMemorization";
import { comparePositions } from "../helpers";
import { getAyahPage } from "@/lib/quran/ayahPages";

describe("calculateNewMemorization", () => {
  it("ascending 1 page from Al-Baqarah: from < to, stays on same page", () => {
    const result = calculateNewMemorization({ surah: 2, ayah: 1 }, 15, "ascending");
    expect(result).not.toBeNull();
    expect(result!.from).toEqual({ surah: 2, ayah: 1 });
    // to should be on same page as from (1 page coverage)
    expect(getAyahPage(result!.to.surah, result!.to.ayah)).toBe(2);
    // from < to in Quran order
    expect(comparePositions(result!.from, result!.to)).toBe(-1);
  });

  it("descending 1 page from Al-Ghashiyah covers Al-Ghashiyah", () => {
    const result = calculateNewMemorization({ surah: 88, ayah: 1 }, 15, "descending");
    expect(result).not.toBeNull();
    // Should cover Al-Ghashiyah (1 page ≈ 1 surah for short surahs)
    expect(result!.from.surah).toBe(88);
    expect(result!.to.surah).toBe(88);
    // from is start of range, to is end (ascending order)
    expect(result!.from).toEqual({ surah: 88, ayah: 1 });
  });

  it("descending 2 pages from Al-Ghashiyah covers multiple surahs", () => {
    const result = calculateNewMemorization({ surah: 88, ayah: 1 }, 30, "descending");
    expect(result).not.toBeNull();
    // Should cover Al-Ghashiyah (88) and go into lower surahs
    expect(result!.range.end.surah).toBe(88); // highest surah covered
    expect(result!.range.start.surah).toBeLessThanOrEqual(87); // extends to lower surahs
    // range is normalized (start <= end)
    expect(comparePositions(result!.range.start, result!.range.end)).toBeLessThanOrEqual(0);
  });

  it("newCursor advances past the covered range", () => {
    const result = calculateNewMemorization({ surah: 50, ayah: 1 }, 15, "ascending");
    expect(result).not.toBeNull();
    // newCursor should be after 'to' for ascending
    expect(comparePositions(result!.newCursor, result!.to)).toBe(1);
  });

  it("newCursor for descending is on the next page down", () => {
    const result = calculateNewMemorization({ surah: 88, ayah: 1 }, 15, "descending");
    expect(result).not.toBeNull();
    // newCursor should be on page 591 (one page below page 592)
    expect(getAyahPage(result!.newCursor.surah, result!.newCursor.ayah)).toBe(591);
  });

  it("range is always normalized (start <= end)", () => {
    const result = calculateNewMemorization({ surah: 88, ayah: 1 }, 30, "descending");
    expect(result).not.toBeNull();
    expect(comparePositions(result!.range.start, result!.range.end)).toBeLessThanOrEqual(0);
  });
});
