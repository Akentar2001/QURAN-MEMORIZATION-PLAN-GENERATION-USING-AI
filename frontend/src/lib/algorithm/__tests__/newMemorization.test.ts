import { describe, it, expect } from "vitest";
import { calculateNewMemorization } from "@/lib/algorithm/newMemorization";
import { BY_POSITION } from "@/lib/quran/verseData";
import type { QuranPosition } from "@/lib/quran/types";

describe("calculateNewMemorization — basic walking", () => {
  it("returns null for 0 pagesPerSession", () => {
    expect(calculateNewMemorization({ surah: 88, ayah: 1 }, 0, "descending", 0, 1)).toBeNull();
  });

  it("returns null for negative pagesPerSession", () => {
    expect(calculateNewMemorization({ surah: 2, ayah: 1 }, -0.1, "ascending", 0, 1)).toBeNull();
  });

  it("ascending walk from Al-Baqarah 1, 1 page/session, day 1", () => {
    const result = calculateNewMemorization({ surah: 2, ayah: 1 }, 1, "ascending", 0, 1);
    expect(result).not.toBeNull();
    expect(result!.from).toEqual({ surah: 2, ayah: 1 });
    expect(result!.to.surah).toBe(2);
    expect(result!.to.ayah).toBeGreaterThan(1);
    const toEntry = BY_POSITION[result!.to.surah]![result!.to.ayah]!;
    const cursorEntry = BY_POSITION[result!.newCursor.surah]![result!.newCursor.ayah]!;
    expect(cursorEntry.orderInQuran).toBeGreaterThan(toEntry.orderInQuran);
  });

  it("descending walk from Al-Ghashiyah 1, 1 page/session, day 1", () => {
    const result = calculateNewMemorization({ surah: 88, ayah: 1 }, 1, "descending", 0, 1);
    expect(result).not.toBeNull();
    expect(result!.from.surah).toBe(88);
    expect(result!.newCursor.surah).toBeLessThanOrEqual(88);
  });

  it("frontier is the last ayah memorized in this session", () => {
    const result = calculateNewMemorization({ surah: 88, ayah: 1 }, 1, "descending", 0, 1);
    expect(result).not.toBeNull();
    expect(result!.frontier).toEqual(result!.to);
  });

  it("range is normalized (start <= end in Quran order)", () => {
    const result = calculateNewMemorization({ surah: 88, ayah: 1 }, 1, "descending", 0, 1);
    expect(result).not.toBeNull();
    const startEntry = BY_POSITION[result!.range.start.surah]![result!.range.start.ayah]!;
    const endEntry = BY_POSITION[result!.range.end.surah]![result!.range.end.ayah]!;
    expect(startEntry.orderInQuran).toBeLessThanOrEqual(endEntry.orderInQuran);
  });
});

describe("calculateNewMemorization — cumulative-budget snap", () => {
  const start: QuranPosition = { surah: 2, ayah: 1 };
  const ppS = 1 / 3;

  it("day 1 boundary: cumulativeActual=0, sessionNumber=1 → todaysBudget = pagesPerSession", () => {
    const r = calculateNewMemorization(start, ppS, "ascending", 0, 1);
    expect(r).not.toBeNull();
    expect(r!.pagesUsed).toBeGreaterThan(0);
    // Walker may extend up to ~110% of budget via the surah-extension rule.
    expect(r!.pagesUsed).toBeLessThanOrEqual(ppS * 1.1 + 0.001);
  });

  it("three sessions of 1/3 page collectively cover roughly one page", () => {
    let cursor: QuranPosition = start;
    let cumulative = 0;
    const pagesUsedPerSession: number[] = [];

    for (let session = 1; session <= 3; session++) {
      const r = calculateNewMemorization(cursor, ppS, "ascending", cumulative, session)!;
      expect(r).not.toBeNull();
      pagesUsedPerSession.push(r.pagesUsed);
      cumulative += r.pagesUsed;
      cursor = r.newCursor;
    }

    expect(cumulative).toBeGreaterThan(0.85);
    expect(cumulative).toBeLessThan(1.15);
  });

  it("under-shoot in prior session is recovered: next session's budget is strictly larger", () => {
    const sessionNumber = 5;
    const target = sessionNumber * ppS;
    // Use a position with many small ayahs so a 0.5-page deficit reliably admits
    // additional verses beyond the baseline.
    const smallVerseStart: QuranPosition = { surah: 78, ayah: 1 }; // An-Naba
    const baseline = calculateNewMemorization(smallVerseStart, ppS, "ascending", target - ppS, sessionNumber)!;
    // Half-page deficit going into the same session.
    const withDeficit = calculateNewMemorization(smallVerseStart, ppS, "ascending", target - ppS - 0.5, sessionNumber)!;
    expect(withDeficit).not.toBeNull();
    expect(withDeficit.pagesUsed).toBeGreaterThan(baseline.pagesUsed);
  });

  it("ahead-of-schedule: returns null when cumulativeActual already meets target", () => {
    const sessionNumber = 5;
    const target = sessionNumber * ppS;
    // Already at the target — no room for today.
    const r = calculateNewMemorization(start, ppS, "ascending", target, sessionNumber);
    expect(r).toBeNull();
  });

  it("end of Quran ascending: cursor past last verse → returns null", () => {
    const past: QuranPosition = { surah: 999, ayah: 999 };
    const r = calculateNewMemorization(past, ppS, "ascending", 0, 1);
    expect(r).toBeNull();
  });

  it("end of Quran descending: cursor past first verse → returns null", () => {
    const past: QuranPosition = { surah: 0, ayah: 0 };
    const r = calculateNewMemorization(past, ppS, "descending", 0, 1);
    expect(r).toBeNull();
  });
});
