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
      null,
      88, // memStartSurah
      1   // memStartAyah
    );
    expect(result).not.toBeNull();
    expect(result!.from).toEqual({ surah: 89, ayah: 1 });
    const startPage = getAyahPage(result!.from.surah, result!.from.ayah);
    const endPage = getAyahPage(result!.to.surah, result!.to.ayah);
    expect(endPage - startPage).toBe(2);
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
      null,
      88, 1
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
      minorRange,
      88, 1
    );
    expect(result).not.toBeNull();
    expect(comparePositions(result!.from, minorRange.end)).toBe(1);
  });

  it("returns null when majRevPages is 0", () => {
    expect(
      calculateMajorRevision({ surah: 89, ayah: 1 }, 0, "descending", null, null, 88, 1)
    ).toBeNull();
  });

  it("wraparound restarts from memStartSurah after reaching end of Quran", () => {
    // Cursor is past An-Nas (sentinel from previous assignment)
    const result = calculateMajorRevision(
      { surah: 115, ayah: 1 }, // past end sentinel
      3,
      "descending", // major = ascending
      null,
      null,
      57, // memStartSurah = Al-Hadid
      1
    );
    expect(result).not.toBeNull();
    // Should restart from Al-Hadid 1 (memStartSurah)
    expect(result!.from).toEqual({ surah: 57, ayah: 1 });
  });

  it("newCursor advances past the covered range", () => {
    const result = calculateMajorRevision(
      { surah: 89, ayah: 1 },
      3,
      "descending",
      null,
      null,
      88, 1
    );
    expect(result).not.toBeNull();
    expect(comparePositions(result!.newCursor, result!.to)).toBe(1);
  });
});
