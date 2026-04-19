import { describe, it, expect } from "vitest";
import { VERSES, SURAHS_DATA, BY_POSITION } from "@/lib/quran/verseData";

describe("verseData integrity", () => {
  it("has 6236 verses", () => {
    expect(VERSES).toHaveLength(6236);
  });

  it("has 114 surahs", () => {
    expect(SURAHS_DATA).toHaveLength(114);
  });

  it("orderInQuran is 1..6236 with no gaps", () => {
    const orders = new Set(VERSES.map((v) => v.orderInQuran));
    for (let i = 1; i <= 6236; i++) {
      expect(orders.has(i)).toBe(true);
    }
  });

  it("reverseIndex is 1..6236 with no gaps", () => {
    const revs = new Set(VERSES.map((v) => v.reverseIndex));
    for (let i = 1; i <= 6236; i++) {
      expect(revs.has(i)).toBe(true);
    }
  });

  it("BY_POSITION lookup returns correct verse", () => {
    const verse = BY_POSITION[1]?.[1];
    expect(verse).toBeDefined();
    expect(verse!.surahId).toBe(1);
    expect(verse!.ayah).toBe(1);
    expect(verse!.orderInQuran).toBe(1);
    expect(verse!.pageNo).toBe(1);
  });

  it("weightOnPage sums to approximately 1.0 per page", () => {
    const page1Verses = VERSES.filter((v) => v.pageNo === 1);
    const sum = page1Verses.reduce((s, v) => s + v.weightOnPage, 0);
    expect(sum).toBeGreaterThan(0.95);
    expect(sum).toBeLessThan(1.05);
  });

  it("Al-Baqarah has 286 ayahs", () => {
    const surah2Verses = VERSES.filter((v) => v.surahId === 2);
    expect(surah2Verses).toHaveLength(286);
  });

  it("SURAHS_DATA[0] is Al-Fatihah with 7 ayahs", () => {
    expect(SURAHS_DATA[0].id).toBe(1);
    expect(SURAHS_DATA[0].ayahCount).toBe(7);
  });
});
