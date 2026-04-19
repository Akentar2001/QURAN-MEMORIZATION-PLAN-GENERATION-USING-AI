import { describe, it, expect } from "vitest";
import {
  comparePositions,
  getNextAyah,
  isPositionInRange,
  toArabicNumerals,
  formatPosition,
  advanceByPages,
  normalizeRange,
  walkByWeight,
} from "@/lib/algorithm/helpers";
import { getAyahPage } from "@/lib/quran/ayahPages";
import { BY_POSITION } from "@/lib/quran/verseData";

describe("comparePositions", () => {
  it("returns 0 for equal positions", () => {
    expect(comparePositions({ surah: 2, ayah: 5 }, { surah: 2, ayah: 5 })).toBe(0);
  });

  it("returns -1 when a is before b (same surah)", () => {
    expect(comparePositions({ surah: 2, ayah: 5 }, { surah: 2, ayah: 10 })).toBe(-1);
  });

  it("returns -1 when a is before b (different surah)", () => {
    expect(comparePositions({ surah: 1, ayah: 7 }, { surah: 2, ayah: 1 })).toBe(-1);
  });

  it("returns 1 when a is after b", () => {
    expect(comparePositions({ surah: 3, ayah: 1 }, { surah: 2, ayah: 286 })).toBe(1);
  });
});

describe("getNextAyah", () => {
  it("moves to next ayah in same surah (ascending)", () => {
    expect(getNextAyah({ surah: 2, ayah: 5 }, "ascending")).toEqual({ surah: 2, ayah: 6 });
  });

  it("crosses to next surah (ascending)", () => {
    expect(getNextAyah({ surah: 1, ayah: 7 }, "ascending")).toEqual({ surah: 2, ayah: 1 });
  });

  it("returns null at end of Quran (ascending)", () => {
    expect(getNextAyah({ surah: 114, ayah: 6 }, "ascending")).toBeNull();
  });

  it("moves to previous ayah (descending)", () => {
    expect(getNextAyah({ surah: 2, ayah: 5 }, "descending")).toEqual({ surah: 2, ayah: 4 });
  });

  it("crosses to previous surah (descending)", () => {
    expect(getNextAyah({ surah: 2, ayah: 1 }, "descending")).toEqual({ surah: 1, ayah: 7 });
  });

  it("returns null at start of Quran (descending)", () => {
    expect(getNextAyah({ surah: 1, ayah: 1 }, "descending")).toBeNull();
  });
});

describe("isPositionInRange", () => {
  const range = { start: { surah: 2, ayah: 10 }, end: { surah: 2, ayah: 50 } };

  it("returns true for position within range", () => {
    expect(isPositionInRange({ surah: 2, ayah: 25 }, range)).toBe(true);
  });

  it("returns true at boundaries", () => {
    expect(isPositionInRange({ surah: 2, ayah: 10 }, range)).toBe(true);
    expect(isPositionInRange({ surah: 2, ayah: 50 }, range)).toBe(true);
  });

  it("returns false outside range", () => {
    expect(isPositionInRange({ surah: 2, ayah: 9 }, range)).toBe(false);
    expect(isPositionInRange({ surah: 2, ayah: 51 }, range)).toBe(false);
    expect(isPositionInRange({ surah: 1, ayah: 5 }, range)).toBe(false);
  });
});

describe("toArabicNumerals", () => {
  it("converts single digit", () => {
    expect(toArabicNumerals(5)).toBe("٥");
  });

  it("converts multi-digit", () => {
    expect(toArabicNumerals(286)).toBe("٢٨٦");
  });
});

describe("formatPosition", () => {
  it("formats Al-Fatiha verse 1", () => {
    expect(formatPosition({ surah: 1, ayah: 1 })).toBe("الفاتحة ١");
  });

  it("formats Al-Baqarah verse 286", () => {
    expect(formatPosition({ surah: 2, ayah: 286 })).toBe("البقرة ٢٨٦");
  });
});

describe("advanceByPages", () => {
  it("ascending 1 page covers exactly 1 page", () => {
    const result = advanceByPages({ surah: 2, ayah: 1 }, 1, "ascending");
    expect(result).not.toBeNull();
    const resultPage = getAyahPage(result!.surah, result!.ayah);
    expect(resultPage).toBe(2);
  });

  it("ascending 2 pages covers 2 pages", () => {
    const result = advanceByPages({ surah: 2, ayah: 1 }, 2, "ascending");
    expect(result).not.toBeNull();
    const resultPage = getAyahPage(result!.surah, result!.ayah);
    expect(resultPage).toBe(3);
  });

  it("descending 1 page from Al-Ghashiyah stays on same page", () => {
    const result = advanceByPages({ surah: 88, ayah: 1 }, 1, "descending");
    expect(result).not.toBeNull();
    const resultPage = getAyahPage(result!.surah, result!.ayah);
    expect(resultPage).toBe(592);
  });

  it("descending 2 pages from Al-Ghashiyah covers pages 592 and 591", () => {
    const result = advanceByPages({ surah: 88, ayah: 1 }, 2, "descending");
    expect(result).not.toBeNull();
    const resultPage = getAyahPage(result!.surah, result!.ayah);
    expect(resultPage).toBe(591);
  });
});

describe("normalizeRange", () => {
  it("keeps already-sorted range", () => {
    const r = normalizeRange({ surah: 1, ayah: 1 }, { surah: 2, ayah: 1 });
    expect(r.start).toEqual({ surah: 1, ayah: 1 });
    expect(r.end).toEqual({ surah: 2, ayah: 1 });
  });

  it("swaps reversed range", () => {
    const r = normalizeRange({ surah: 88, ayah: 26 }, { surah: 86, ayah: 1 });
    expect(r.start).toEqual({ surah: 86, ayah: 1 });
    expect(r.end).toEqual({ surah: 88, ayah: 26 });
  });
});

describe("walkByWeight", () => {
  it("walks forward and returns pagesUsed close to budget", () => {
    const result = walkByWeight({ surah: 2, ayah: 1 }, 1.0, "ascending");
    expect(result.from).toEqual({ surah: 2, ayah: 1 });
    expect(result.pagesUsed).toBeGreaterThan(0.9);
    expect(result.pagesUsed).toBeLessThan(1.15);
  });

  it("stops before entering stopPlace surah", () => {
    const result = walkByWeight({ surah: 2, ayah: 1 }, 20.0, "ascending", 3);
    expect(result.to.surah).toBe(2);
  });

  it("walks descending and returns a position before start (verified by orderInQuran)", () => {
    const result = walkByWeight({ surah: 114, ayah: 6 }, 1.0, "descending");
    expect(result.from.surah).toBe(114);
    const fromEntry = BY_POSITION[result.from.surah]![result.from.ayah]!;
    const toEntry = BY_POSITION[result.to.surah]![result.to.ayah]!;
    expect(toEntry.orderInQuran).toBeLessThan(fromEntry.orderInQuran);
  });

  it("10% surah-snap: stays within Al-Fatihah when budget is 0.8 pages starting at Al-Fatihah 1", () => {
    const result = walkByWeight({ surah: 1, ayah: 1 }, 0.8, "ascending");
    expect(result.to.surah).toBe(1);
    expect(result.to.ayah).toBeGreaterThan(0);
  });
});
