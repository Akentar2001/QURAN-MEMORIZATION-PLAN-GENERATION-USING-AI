import { describe, it, expect } from "vitest";
import {
  comparePositions,
  getNextAyah,
  isPositionInRange,
  toArabicNumerals,
  formatPosition,
  normalizeRange,
  walkByWeight,
} from "@/lib/algorithm/helpers";
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

describe("walkByWeight surah-completion extension", () => {
  // Al-Mursalat (77, 50 ayahs, ~1.55 pages total). At ayah 48 the remainder
  // (ayahs 49-50) is ~3% of surah weight — well below the 10% threshold.
  it("finishes Al-Mursalat when ≤10% of surah remains (ayah 48 → 50)", () => {
    const result = walkByWeight({ surah: 77, ayah: 48 }, 0.001, "ascending");
    expect(result.to.surah).toBe(77);
    expect(result.to.ayah).toBe(50);
  });

  it("does NOT extend when more than 10% of the surah remains", () => {
    // Walking from Al-Mursalat ayah 1 with a half-page budget: walker stops
    // somewhere mid-surah with far more than 10% of the surah still ahead.
    const result = walkByWeight({ surah: 77, ayah: 1 }, 0.5, "ascending");
    expect(result.to.surah).toBe(77);
    expect(result.to.ayah).toBeLessThan(45);
  });

  it("one-line floor: finishes An-Nas when only one short ayah remains", () => {
    // An-Nas (114, 6 ayahs). Walking from ayah 5 with a tiny budget: walker
    // accepts no verses; remainder is ayah 6 (~0.05 page = within 1 line).
    const result = walkByWeight({ surah: 114, ayah: 5 }, 0.001, "ascending");
    expect(result.to.surah).toBe(114);
    expect(result.to.ayah).toBe(6);
  });

  it("descending walk also extends to surah end (in-surah order is always ascending)", () => {
    // Walking with direction='descending' from Mursalat ayah 48: in-surah
    // order is still ascending (48 → 49 → 50). With a tiny budget the walker
    // accepts no extra verses; remaining (49-50) is < 10% of surah weight,
    // so extension fires forward to ayah 50.
    const result = walkByWeight({ surah: 77, ayah: 48 }, 0.001, "descending");
    expect(result.to.surah).toBe(77);
    expect(result.to.ayah).toBe(50);
  });

  it("absolute safety cap: never extends if remainder exceeds 0.5 pages", () => {
    // Al-Baqarah is ~48 pages. With a budget of 40 the walker stops well short
    // of the end, and the remainder weight far exceeds the 0.5-page cap, so
    // the surah-completion extension must not fire.
    const result = walkByWeight({ surah: 2, ayah: 1 }, 40, "ascending");
    expect(result.to.ayah).toBeLessThan(286);
  });
});
