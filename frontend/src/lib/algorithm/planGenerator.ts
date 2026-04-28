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
import { calculateMinorRevision, type MemoSession } from "./minorRevision";
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

  let memCursor: QuranPosition = {
    surah: config.memStartSurah,
    ayah: config.memStartAyah,
  };

  // Major revision cursor: nullable. Seeded from majRevStart on W1; becomes
  // null when the walker exhausts the Quran in the review direction, which
  // signals calculateMajorRevision to wrap by teleporting past the active
  // wall surah on the next call.
  let majRevCursor: QuranPosition | null = {
    surah: config.majRevStartSurah,
    ayah: config.majRevStartAyah,
  };

  // Past memorization sessions (most-recent first). Minor revision replays
  // these whole-day chunks, mirroring the Python backend.
  const pastSessions: MemoSession[] = [];

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

    // 2. Minor revision: replay whole previous-day sessions (most recent
    // first), stopping when adding another session would overshoot the
    // page budget farther than under-shooting it.
    const minorResult = calculateMinorRevision(pastSessions, config.minorRevPages);

    if (minorResult) {
      row.minorFrom = formatPosition(minorResult.from);
      row.minorTo = formatPosition(minorResult.to);
    }

    // 3. Major revision: walks forward in review direction from a persistent
    // cursor, stopping at a single wall = today's minor (or memo if no minor)
    // start surah. Mirrors the Python backend's stop_place semantics.
    const majResult = calculateMajorRevision(
      majRevCursor,
      config.majRevPages,
      config.direction,
      minorResult?.from.surah ?? null,
      memResult?.from.surah ?? null
    );

    if (majResult) {
      row.majorBlocks = majResult.blocks.map((b) => formatRangeClean(b.from, b.to));
      majRevCursor = majResult.newCursor;
    }

    assignments.push(row);

    // Append today's session AFTER all three sub-plans, so today's memo is
    // available for tomorrow's minor revision (matches Python's post-loop
    // memo_sissions refresh).
    if (memResult) {
      pastSessions.unshift({
        start: memResult.from,
        end: memResult.to,
        pages: memResult.pagesUsed,
      });
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
