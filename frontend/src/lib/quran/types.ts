export interface Surah {
  number: number;
  nameArabic: string;
  nameEnglish: string;
  startPage: number;
  ayahCount: number;
}

export interface QuranPosition {
  surah: number;
  ayah: number;
}

export interface PositionRange {
  start: QuranPosition;
  end: QuranPosition;
}

export type Direction = "descending" | "ascending";

export interface StudentConfig {
  id: string;
  name: string;
  halaqah: string;
  planType: "independent" | "sameAs";
  sameAsStudentId?: string;

  memStartSurah: number;
  memStartAyah: number;
  linesPerSession: number;
  direction: Direction;

  minorRevPages: number;
  majRevStartSurah: number;
  majRevStartAyah: number;
  majRevPages: number;
}

export interface MajorBlock {
  from: string;
  to: string;
}

export interface AssignmentRow {
  assignmentNumber: number;
  memFrom: string | null;
  memTo: string | null;
  minorFrom: string | null;
  minorTo: string | null;
  majorBlocks: MajorBlock[];
}

export interface StudentPlan {
  studentId: string;
  studentName: string;
  halaqah: string;
  settingsSummary: string;
  assignments: AssignmentRow[];
}

