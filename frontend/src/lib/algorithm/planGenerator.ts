import type {
  StudentConfig,
  StudentPlan,
  AssignmentRow,
  QuranPosition,
  PositionRange,
} from "@/lib/quran/types";
import { ASSIGNMENTS_COUNT } from "@/lib/quran/constants";
import { getSurahByNumber } from "@/lib/quran/surahs";
import { formatPosition, toArabicNumerals } from "./helpers";
import { calculateNewMemorization } from "./newMemorization";
import { calculateMinorRevision } from "./minorRevision";
import { calculateMajorRevision } from "./majorRevision";

/**
 * Build an Arabic settings summary string for the plan header.
 */
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
 * Generate a complete 30-assignment memorization plan for a student.
 */
export function generatePlan(config: StudentConfig): StudentPlan {
  const assignments: AssignmentRow[] = [];

  // State trackers
  let memCursor: QuranPosition = {
    surah: config.memStartSurah,
    ayah: config.memStartAyah,
  };
  let majRevCursor: QuranPosition = {
    surah: config.majRevStartSurah,
    ayah: config.majRevStartAyah,
  };

  // Track all previous memorization sessions for minor revision rolling window
  const previousSessions: PositionRange[] = [];

  for (let i = 1; i <= ASSIGNMENTS_COUNT; i++) {
    const row: AssignmentRow = {
      assignmentNumber: i,
      memFrom: null,
      memTo: null,
      minorFrom: null,
      minorTo: null,
      majorFrom: null,
      majorTo: null,
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

    // 2. Minor revision - rolling window over previous sessions (not including current)
    const minorResult = calculateMinorRevision(
      previousSessions,
      config.minorRevPages
    );

    if (minorResult) {
      row.minorFrom = formatPosition(minorResult.from);
      row.minorTo = formatPosition(minorResult.to);
    }

    // 3. Major revision
    const majResult = calculateMajorRevision(
      majRevCursor,
      config.majRevPages,
      config.direction,
      memResult?.range ?? null,
      minorResult?.range ?? null,
      config.memStartSurah,
      config.memStartAyah
    );

    if (majResult) {
      row.majorFrom = formatPosition(majResult.from);
      row.majorTo = formatPosition(majResult.to);
      majRevCursor = majResult.newCursor;
    }

    assignments.push(row);

    // Add this assignment's memorization to previousSessions for next iteration
    if (memResult) {
      previousSessions.push(memResult.range);
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
