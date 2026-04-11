import { describe, it, expect } from "vitest";
import { calculateMajorRevision } from "../majorRevision";
import { comparePositions } from "../helpers";
import { getAyahPage } from "@/lib/quran/ayahPages";

describe("calculateMajorRevision", () => {
  it("ascending major (descending memorization) from Al-Fajr covers 3 pages", () => {
    const result = calculateMajorRevision(
      { surah: 89, ayah: 1 },
      3,
      "descending",
      null,
      null
    );
    expect(result).not.toBeNull();
    expect(result!.from).toEqual({ surah: 89, ayah: 1 });
    const startPage = getAyahPage(result!.from.surah, result!.from.ayah);
    const endPage = getAyahPage(result!.to.surah, result!.to.ayah);
    expect(endPage - startPage).toBe(2); // 3 pages = pages 593, 594, 595
  });

  it("skips current assignment memorization range", () => {
    const memRange = {
      start: { surah: 89, ayah: 1 },
      end: { surah: 89, ayah: 10 },
    };
    const result = calculateMajorRevision(
      { surah: 89, ayah: 1 },
      1,
      "descending",
      memRange,
      null
    );
    expect(result).not.toBeNull();
    expect(comparePositions(result!.from, memRange.end)).toBe(1);
  });

  it("skips both memorization and minor ranges", () => {
    const memRange = {
      start: { surah: 89, ayah: 1 },
      end: { surah: 89, ayah: 10 },
    };
    const minorRange = {
      start: { surah: 89, ayah: 11 },
      end: { surah: 89, ayah: 20 },
    };
    const result = calculateMajorRevision(
      { surah: 89, ayah: 1 },
      1,
      "descending",
      memRange,
      minorRange
    );
    expect(result).not.toBeNull();
    expect(comparePositions(result!.from, minorRange.end)).toBe(1);
  });

  it("returns null when majRevPages is 0", () => {
    expect(calculateMajorRevision({ surah: 89, ayah: 1 }, 0, "descending", null, null)).toBeNull();
  });

  it("newCursor advances past the covered range", () => {
    const result = calculateMajorRevision({ surah: 89, ayah: 1 }, 3, "descending", null, null);
    expect(result).not.toBeNull();
    expect(comparePositions(result!.newCursor, result!.to)).toBe(1);
  });

  it("range is always normalized", () => {
    const result = calculateMajorRevision({ surah: 89, ayah: 1 }, 3, "descending", null, null);
    expect(result).not.toBeNull();
    expect(comparePositions(result!.range.start, result!.range.end)).toBeLessThanOrEqual(0);
  });
});
