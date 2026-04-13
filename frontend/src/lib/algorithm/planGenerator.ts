import type {
  StudentConfig,
  StudentPlan,
  AssignmentRow,
  QuranPosition,
} from "@/lib/quran/types";
import { ASSIGNMENTS_COUNT } from "@/lib/quran/constants";
import { getSurahByNumber } from "@/lib/quran/surahs";
import { formatPosition, formatRangeClean, toArabicNumerals } from "./helpers";
import { calculateNewMemorization } from "./newMemorization";
import { calculateMinorRevision } from "./minorRevision";
import { calculateMajorRevision } from "./majorRevision";

function buildSettingsSummary(config: StudentConfig): string {
  const memSurah = getSurahByNumber(config.memStartSurah);
  const majSurah = getSurahByNumber(config.majRevStartSurah);
  const directionLabel =
    config.direction === "descending" ? "تنازلي" : "تصاعدي";

  return [
    `الحفظ: ${memSurah.nameArabic} آية ${toArabicNumerals(config.memStartAyah)}`,
    `الاتجاه: ${directionLabel}`,
    `المقدار: ${toArabicNumerals(config.linesPerSession)} سطر`,
    `المراجعة الصغرى: ${toArabicNumerals(config.minorRevPages)} صفحة`,
    `المراجعة الكبرى: ${majSurah.nameArabic} - ${toArabicNumerals(config.majRevPages)} صفحات`,
  ].join(" | ");
}

/**
 * Generate a 30-assignment memorization plan.
 *
 * Orchestrates: new memorization → minor revision (volume-based rolling window
 * up to the frontier) → major revision (continuous cursor cycling between a
 * dynamic start-line just past the minor zone and An-Nas 6, wrapping as needed).
 *
 * The major cursor persists across assignments: W_n ends at cursor C, then
 * W_{n+1} starts at C+1. Only wraparound (hitting An-Nas) or a swallowing
 * minor zone causes a reset to the start-line.
 */
export function generatePlan(config: StudentConfig): StudentPlan {
  const assignments: AssignmentRow[] = [];

  const memStart: QuranPosition = {
    surah: config.memStartSurah,
    ayah: config.memStartAyah,
  };
  let memCursor: QuranPosition = { ...memStart };

  // Persistent major revision cursor — seeded from majRevStart on W1, then
  // advances continuously across assignments.
  let majRevCursor: QuranPosition = {
    surah: config.majRevStartSurah,
    ayah: config.majRevStartAyah,
  };

  // Frontier from the PREVIOUS assignment. The minor revision walks back
  // from here, so it covers ONLY material memorized before today's new task
  // (excluding today's task itself).
  let previousFrontier: QuranPosition | null = null;

  for (let i = 1; i <= ASSIGNMENTS_COUNT; i++) {
    const row: AssignmentRow = {
      assignmentNumber: i,
      memFrom: null,
      memTo: null,
      minorFrom: null,
      minorTo: null,
      majorBlocks: [],
    };

    // 1. New memorization
    const memResult = calculateNewMemorization(
      memCursor,
      config.linesPerSession,
      config.direction
    );

    if (memResult) {
      row.memFrom = formatPosition(memResult.from);
      row.memTo = formatPosition(memResult.to);
      memCursor = memResult.newCursor;
    }

    // 2. Minor revision: X-page rolling window "immediately preceding" today's
    // new task. Walks back from the previous assignment's frontier so today's
    // memorization is NOT included in the minor zone.
    const minorResult = previousFrontier
      ? calculateMinorRevision(
          previousFrontier,
          config.minorRevPages,
          memStart,
          config.direction
        )
      : null;

    if (minorResult) {
      row.minorFrom = formatPosition(minorResult.from);
      row.minorTo = formatPosition(minorResult.to);
    }

    // 3. Major revision: confined to the Known Universe (frontier → majRevStart),
    // wraps at the oldest historical boundary.
    const majResult = calculateMajorRevision(
      majRevCursor,
      config.majRevPages,
      config.direction,
      minorResult?.range ?? null,
      memResult?.range ?? null,
      { surah: config.majRevStartSurah, ayah: config.majRevStartAyah }
    );

    if (majResult) {
      row.majorBlocks = majResult.blocks.map((b) => formatRangeClean(b.from, b.to));
      majRevCursor = majResult.newCursor;
    }

    assignments.push(row);

    if (memResult) {
      previousFrontier = memResult.frontier;
    }
  }

  return {
    studentId: config.id,
    studentName: config.name,
    halaqah: config.halaqah,
    settingsSummary: buildSettingsSummary(config),
    assignments,
  };
}
