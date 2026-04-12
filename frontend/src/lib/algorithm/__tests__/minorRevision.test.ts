import { describe, it, expect } from "vitest";
import { calculateMinorRevision } from "../minorRevision";
import { comparePositions } from "../helpers";
import type { PositionRange } from "@/lib/quran/types";

describe("calculateMinorRevision (rolling window)", () => {
  it("returns null when no previous sessions", () => {
    expect(calculateMinorRevision([], 1)).toBeNull();
  });

  it("returns null when minorRevPages is 0", () => {
    const sessions: PositionRange[] = [
      { start: { surah: 57, ayah: 1 }, end: { surah: 57, ayah: 3 } },
    ];
    expect(calculateMinorRevision(sessions, 0)).toBeNull();
  });

  it("single session: returns that session's range", () => {
    const sessions: PositionRange[] = [
      { start: { surah: 57, ayah: 1 }, end: { surah: 57, ayah: 3 } },
    ];
    const result = calculateMinorRevision(sessions, 5);
    expect(result).not.toBeNull();
    expect(result!.from).toEqual({ surah: 57, ayah: 1 });
    expect(result!.to).toEqual({ surah: 57, ayah: 3 });
  });

  it("two sessions: combines them (matches user's spec example)", () => {
    // Assignment 1: Al-Hadid 1-3, Assignment 2: Al-Hadid 4-11
    // At assignment 3, minor should show Al-Hadid 1-11
    const sessions: PositionRange[] = [
      { start: { surah: 57, ayah: 1 }, end: { surah: 57, ayah: 3 } },
      { start: { surah: 57, ayah: 4 }, end: { surah: 57, ayah: 11 } },
    ];
    const result = calculateMinorRevision(sessions, 5);
    expect(result).not.toBeNull();
    // from = start of oldest session = 57:1
    expect(result!.from).toEqual({ surah: 57, ayah: 1 });
    // to = end of latest session = 57:11
    expect(result!.to).toEqual({ surah: 57, ayah: 11 });
  });

  it("rolls when exceeding max pages (drops oldest)", () => {
    // 6 sessions, each 1 page (small surahs), max = 3 pages
    const sessions: PositionRange[] = [
      { start: { surah: 100, ayah: 1 }, end: { surah: 100, ayah: 11 } }, // oldest
      { start: { surah: 101, ayah: 1 }, end: { surah: 101, ayah: 11 } },
      { start: { surah: 102, ayah: 1 }, end: { surah: 102, ayah: 8 } },
      { start: { surah: 103, ayah: 1 }, end: { surah: 103, ayah: 3 } },
      { start: { surah: 104, ayah: 1 }, end: { surah: 104, ayah: 9 } },
      { start: { surah: 105, ayah: 1 }, end: { surah: 105, ayah: 5 } }, // latest
    ];
    const result = calculateMinorRevision(sessions, 3);
    expect(result).not.toBeNull();
    // Should include only the most recent sessions that fit in 3 pages
    // Latest = session 105. Earlier included sessions should be added backward.
    expect(result!.to).toEqual({ surah: 105, ayah: 5 });
    // The "from" is an earlier session (not the oldest)
    expect(result!.from.surah).toBeGreaterThan(100);
  });

  it("range is a union of all included sessions", () => {
    const sessions: PositionRange[] = [
      { start: { surah: 57, ayah: 1 }, end: { surah: 57, ayah: 29 } },
      { start: { surah: 56, ayah: 1 }, end: { surah: 56, ayah: 50 } },
    ];
    const result = calculateMinorRevision(sessions, 10);
    expect(result).not.toBeNull();
    // Range union should span from 56:1 to 57:29 (min to max in Quran order)
    expect(result!.range.start).toEqual({ surah: 56, ayah: 1 });
    expect(result!.range.end).toEqual({ surah: 57, ayah: 29 });
  });

  it("descending memorization: from=high surah, to=low surah (reading direction)", () => {
    // Sessions in chronological order for descending memorization
    const sessions: PositionRange[] = [
      { start: { surah: 57, ayah: 1 }, end: { surah: 57, ayah: 29 } }, // Al-Hadid first
      { start: { surah: 56, ayah: 1 }, end: { surah: 56, ayah: 50 } }, // Al-Waqi'ah next
    ];
    const result = calculateMinorRevision(sessions, 10);
    expect(result).not.toBeNull();
    // from = start of oldest = Al-Hadid 1 (57:1)
    // to = end of latest = Al-Waqi'ah 50 (56:50)
    expect(result!.from).toEqual({ surah: 57, ayah: 1 });
    expect(result!.to).toEqual({ surah: 56, ayah: 50 });
    // In Quran order: from > to (57:1 > 56:50)
    expect(comparePositions(result!.from, result!.to)).toBe(1);
  });
});
