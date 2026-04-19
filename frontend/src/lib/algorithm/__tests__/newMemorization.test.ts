import { describe, it, expect } from "vitest";
import { calculateNewMemorization } from "@/lib/algorithm/newMemorization";
import { BY_POSITION } from "@/lib/quran/verseData";

describe("calculateNewMemorization", () => {
  it("returns null for 0 lines", () => {
    expect(calculateNewMemorization({ surah: 88, ayah: 1 }, 0, "descending")).toBeNull();
  });

  it("ascending walk from Al-Baqarah 1, 1 page", () => {
    const result = calculateNewMemorization({ surah: 2, ayah: 1 }, 15, "ascending");
    expect(result).not.toBeNull();
    expect(result!.from).toEqual({ surah: 2, ayah: 1 });
    expect(result!.to.surah).toBe(2);
    expect(result!.to.ayah).toBeGreaterThan(1);
    const toEntry = BY_POSITION[result!.to.surah]![result!.to.ayah]!;
    const cursorEntry = BY_POSITION[result!.newCursor.surah]![result!.newCursor.ayah]!;
    expect(cursorEntry.orderInQuran).toBeGreaterThan(toEntry.orderInQuran);
  });

  it("descending walk from Al-Ghashiyah 1, 15 lines (1 page)", () => {
    const result = calculateNewMemorization({ surah: 88, ayah: 1 }, 15, "descending");
    expect(result).not.toBeNull();
    expect(result!.from.surah).toBe(88);
    expect(result!.newCursor.surah).toBeLessThanOrEqual(88);
  });

  it("frontier is the last ayah memorized in this session", () => {
    const result = calculateNewMemorization({ surah: 88, ayah: 1 }, 15, "descending");
    expect(result).not.toBeNull();
    expect(result!.frontier).toEqual(result!.to);
  });

  it("range is normalized (start <= end in Quran order)", () => {
    const result = calculateNewMemorization({ surah: 88, ayah: 1 }, 15, "descending");
    expect(result).not.toBeNull();
    const startEntry = BY_POSITION[result!.range.start.surah]![result!.range.start.ayah]!;
    const endEntry = BY_POSITION[result!.range.end.surah]![result!.range.end.ayah]!;
    expect(startEntry.orderInQuran).toBeLessThanOrEqual(endEntry.orderInQuran);
  });
});
