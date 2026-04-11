import { describe, it, expect } from "vitest";
import { SURAHS } from "@/lib/quran/surahs";
import { TOTAL_SURAHS, TOTAL_AYAHS } from "@/lib/quran/constants";

describe("Surah metadata", () => {
  it("has exactly 114 surahs", () => {
    expect(SURAHS).toHaveLength(TOTAL_SURAHS);
  });

  it("surah numbers are sequential 1-114", () => {
    SURAHS.forEach((s, i) => {
      expect(s.number).toBe(i + 1);
    });
  });

  it("Al-Fatiha is surah 1 starting at page 1", () => {
    expect(SURAHS[0].nameArabic).toBe("الفاتحة");
    expect(SURAHS[0].startPage).toBe(1);
    expect(SURAHS[0].ayahCount).toBe(7);
  });

  it("An-Nas is surah 114 starting at page 604", () => {
    expect(SURAHS[113].nameArabic).toBe("الناس");
    expect(SURAHS[113].startPage).toBe(604);
    expect(SURAHS[113].ayahCount).toBe(6);
  });

  it("start pages are non-decreasing", () => {
    for (let i = 1; i < SURAHS.length; i++) {
      expect(SURAHS[i].startPage).toBeGreaterThanOrEqual(SURAHS[i - 1].startPage);
    }
  });

  it("all start pages are between 1 and 604", () => {
    SURAHS.forEach((s) => {
      expect(s.startPage).toBeGreaterThanOrEqual(1);
      expect(s.startPage).toBeLessThanOrEqual(604);
    });
  });

  it("total ayah count across all surahs equals 6236", () => {
    const total = SURAHS.reduce((sum, s) => sum + s.ayahCount, 0);
    expect(total).toBe(TOTAL_AYAHS);
  });

  it("all surahs have at least 1 ayah", () => {
    SURAHS.forEach((s) => {
      expect(s.ayahCount).toBeGreaterThanOrEqual(1);
    });
  });

  it("all surahs have Arabic names", () => {
    SURAHS.forEach((s) => {
      expect(s.nameArabic.length).toBeGreaterThan(0);
    });
  });
});
