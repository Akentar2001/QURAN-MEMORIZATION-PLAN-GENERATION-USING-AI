import { describe, it, expect } from "vitest";
import { SURAHS } from "@/lib/quran/surahs";
import { TOTAL_SURAHS, TOTAL_AYAHS } from "@/lib/quran/constants";
import { AYAH_PAGES, getAyahPage, getPageStartAyah } from "@/lib/quran/ayahPages";

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

describe("Ayah-to-page mapping", () => {
  it("has entries for all 114 surahs", () => {
    expect(AYAH_PAGES.length).toBe(TOTAL_SURAHS + 1);
  });

  it("total ayah count matches 6236", () => {
    let total = 0;
    for (let s = 1; s <= TOTAL_SURAHS; s++) {
      total += AYAH_PAGES[s].length - 1;
    }
    expect(total).toBe(TOTAL_AYAHS);
  });

  it("ayah counts match surah metadata", () => {
    SURAHS.forEach((surah) => {
      const ayahCount = AYAH_PAGES[surah.number].length - 1;
      expect(ayahCount).toBe(surah.ayahCount);
    });
  });

  it("all pages are between 1 and 604", () => {
    for (let s = 1; s <= TOTAL_SURAHS; s++) {
      for (let a = 1; a < AYAH_PAGES[s].length; a++) {
        expect(AYAH_PAGES[s][a]).toBeGreaterThanOrEqual(1);
        expect(AYAH_PAGES[s][a]).toBeLessThanOrEqual(604);
      }
    }
  });

  it("pages are non-decreasing within each surah", () => {
    for (let s = 1; s <= TOTAL_SURAHS; s++) {
      for (let a = 2; a < AYAH_PAGES[s].length; a++) {
        expect(AYAH_PAGES[s][a]).toBeGreaterThanOrEqual(AYAH_PAGES[s][a - 1]);
      }
    }
  });

  it("first ayah of each surah matches surah startPage", () => {
    SURAHS.forEach((surah) => {
      expect(AYAH_PAGES[surah.number][1]).toBe(surah.startPage);
    });
  });

  it("getAyahPage returns correct page", () => {
    expect(getAyahPage(1, 1)).toBe(1);
    expect(getAyahPage(2, 1)).toBe(2);
    expect(getAyahPage(114, 6)).toBe(604);
  });

  it("getPageStartAyah returns first ayah on a page", () => {
    const pos = getPageStartAyah(1);
    expect(pos.surah).toBe(1);
    expect(pos.ayah).toBe(1);
  });
});
