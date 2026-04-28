import { describe, it, expect } from "vitest";
import { calculateMinorRevision, type MemoSession } from "@/lib/algorithm/minorRevision";
import { BY_POSITION } from "@/lib/quran/verseData";

describe("calculateMinorRevision", () => {
  it("returns null when there are no past sessions (assignment 1)", () => {
    expect(calculateMinorRevision([], 1)).toBeNull();
  });

  it("returns null for non-positive page budget", () => {
    const sessions: MemoSession[] = [
      { start: { surah: 88, ayah: 1 }, end: { surah: 88, ayah: 26 }, pages: 1 },
    ];
    expect(calculateMinorRevision(sessions, 0)).toBeNull();
  });

  it("returns the only past session when there is one", () => {
    const sessions: MemoSession[] = [
      { start: { surah: 88, ayah: 1 }, end: { surah: 88, ayah: 26 }, pages: 1 },
    ];
    const result = calculateMinorRevision(sessions, 1);
    expect(result).not.toBeNull();
    expect(result!.from).toEqual({ surah: 88, ayah: 1 });
    expect(result!.to).toEqual({ surah: 88, ayah: 26 });
  });

  it("greedy fill: stops adding when overshooting moves the total farther from target", () => {
    // target = 1 page. latest session = 0.5 pages. adding next 0.5 → 1.0 (closer). adding next 5.0 would overshoot to 6.0 (worse).
    const sessions: MemoSession[] = [
      { start: { surah: 90, ayah: 1 }, end: { surah: 90, ayah: 20 }, pages: 0.5 },
      { start: { surah: 91, ayah: 1 }, end: { surah: 91, ayah: 15 }, pages: 0.5 },
      { start: { surah: 2, ayah: 1 }, end: { surah: 2, ayah: 286 }, pages: 5.0 },
    ];
    const result = calculateMinorRevision(sessions, 1);
    expect(result).not.toBeNull();
    // includes first two sessions (total 1.0), excludes the 5-page one
    expect(result!.from).toEqual({ surah: 91, ayah: 1 });
    expect(result!.to).toEqual({ surah: 90, ayah: 20 });
  });

  it("range is normalized (start <= end in Quran order)", () => {
    const sessions: MemoSession[] = [
      { start: { surah: 90, ayah: 1 }, end: { surah: 90, ayah: 20 }, pages: 0.5 },
      { start: { surah: 91, ayah: 1 }, end: { surah: 91, ayah: 15 }, pages: 0.5 },
    ];
    const result = calculateMinorRevision(sessions, 1);
    expect(result).not.toBeNull();
    const startEntry = BY_POSITION[result!.range.start.surah]![result!.range.start.ayah]!;
    const endEntry = BY_POSITION[result!.range.end.surah]![result!.range.end.ayah]!;
    expect(startEntry.orderInQuran).toBeLessThanOrEqual(endEntry.orderInQuran);
  });
});
