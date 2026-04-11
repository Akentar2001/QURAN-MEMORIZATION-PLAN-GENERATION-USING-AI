import { describe, it, expect } from "vitest";
import { calculateMinorRevision } from "../minorRevision";
import { comparePositions } from "../helpers";

describe("calculateMinorRevision", () => {
  it("returns null for assignment 1", () => {
    const result = calculateMinorRevision({ surah: 88, ayah: 1 }, 1, "descending", 1);
    expect(result).toBeNull();
  });

  it("descending memorization: minor revision goes ascending", () => {
    // Cursor was at 87:1 at start of this assignment (descending from 88)
    // Minor should go ascending from 87:2 (adjacent to cursor in opposite direction)
    const result = calculateMinorRevision({ surah: 87, ayah: 1 }, 1, "descending", 2);
    expect(result).not.toBeNull();
    // revStart should be 87:2 (one ayah ascending from 87:1)
    expect(result!.from).toEqual({ surah: 87, ayah: 2 });
    // range should be normalized (start <= end)
    expect(comparePositions(result!.range.start, result!.range.end)).toBeLessThanOrEqual(0);
  });

  it("ascending memorization: minor revision goes descending", () => {
    const result = calculateMinorRevision({ surah: 2, ayah: 40 }, 1, "ascending", 2);
    expect(result).not.toBeNull();
    // revStart should be 2:39 (one ayah descending from 2:40)
    expect(result!.from).toEqual({ surah: 2, ayah: 39 });
  });

  it("returns null when minorRevPages is 0", () => {
    expect(calculateMinorRevision({ surah: 50, ayah: 1 }, 0, "ascending", 5)).toBeNull();
  });

  it("returns null at Quran boundary", () => {
    // Ascending from 1:1, minor goes descending — nothing before Al-Fatiha
    expect(calculateMinorRevision({ surah: 1, ayah: 1 }, 1, "ascending", 2)).toBeNull();
  });
});
