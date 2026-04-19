import { describe, it, expect } from "vitest";
import { calculateMinorRevision } from "@/lib/algorithm/minorRevision";
import { BY_POSITION } from "@/lib/quran/verseData";

describe("calculateMinorRevision", () => {
  it("returns null for assignment 1 (no previous frontier)", () => {
    expect(calculateMinorRevision(null, 5, { surah: 88, ayah: 1 }, "descending")).toBeNull();
  });

  it("returns null for 0 pages budget", () => {
    expect(
      calculateMinorRevision({ surah: 87, ayah: 19 }, 0, { surah: 88, ayah: 1 }, "descending")
    ).toBeNull();
  });

  it("descending: minor zone ends at frontier, walks backward toward memStart", () => {
    const result = calculateMinorRevision(
      { surah: 87, ayah: 19 },
      5,
      { surah: 88, ayah: 1 },
      "descending"
    );
    expect(result).not.toBeNull();
    expect(result!.to).toEqual({ surah: 87, ayah: 19 });
    const fromEntry = BY_POSITION[result!.from.surah]![result!.from.ayah]!;
    const toEntry = BY_POSITION[result!.to.surah]![result!.to.ayah]!;
    expect(fromEntry.orderInQuran).toBeLessThanOrEqual(toEntry.orderInQuran);
  });

  it("range is normalized (start <= end in Quran order)", () => {
    const result = calculateMinorRevision(
      { surah: 87, ayah: 19 },
      5,
      { surah: 88, ayah: 1 },
      "descending"
    );
    expect(result).not.toBeNull();
    const startEntry = BY_POSITION[result!.range.start.surah]![result!.range.start.ayah]!;
    const endEntry = BY_POSITION[result!.range.end.surah]![result!.range.end.ayah]!;
    expect(startEntry.orderInQuran).toBeLessThanOrEqual(endEntry.orderInQuran);
  });
});
