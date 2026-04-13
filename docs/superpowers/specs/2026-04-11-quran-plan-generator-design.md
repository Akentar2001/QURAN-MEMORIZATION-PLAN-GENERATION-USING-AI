# Quran Memorization Plan Generator - Design Spec

**Date:** 2026-04-11
**Status:** Approved

## Context

Quran teachers (Halaqah instructors) need a tool to generate structured 30-assignment memorization plans for their students. Currently this is done manually, which is time-consuming and error-prone. This app automates plan generation with an ayah-level algorithm that uses page-based advancement across the Quran, producing print-ready PDF schedules.

This is the first piece of the larger HIFZ-AI platform. It will later integrate with a Django backend, but for now runs entirely client-side.

## Technology Stack

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16.2.3 LTS | App Router, SSR shell |
| React | 19+ | UI framework |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | v4 | Styling, RTL support |
| Zustand | latest | State management |
| react-to-print | latest | PDF/print generation |
| Vitest | latest | Algorithm testing |
| Amiri font | self-hosted | Arabic serif for print quality |

## Project Structure

```
QURAN-MEMORIZATION-PLAN-GENERATION-USING-AI/
  docs/                          # existing documentation
  frontend/                      # Next.js 16 application
    package.json
    tsconfig.json
    tailwind.config.ts
    next.config.ts
    postcss.config.mjs
    public/
      fonts/
        Amiri-Regular.ttf
        Amiri-Bold.ttf
    src/
      app/
        layout.tsx               # Root: <html lang="ar" dir="rtl">, fonts, Tailwind
        globals.css              # Tailwind directives + @media print CSS
        page.tsx                 # Redirects to /setup
        setup/
          page.tsx               # Server Component shell
          SetupClient.tsx        # 'use client' interactive form
        preview/
          page.tsx               # Server Component shell
          PreviewClient.tsx      # 'use client' plan display + print
      components/
        ui/                      # Generic: Button, Select, Input, Card
        setup/                   # StudentCard, MemorizationSettings, RevisionSettings, SurahSelect
        preview/                 # PlanTable, PlanHeader, PlanFooter, PrintableSheet
      lib/
        quran/
          types.ts               # All TypeScript interfaces
          surahs.ts              # 114 surahs (number, nameArabic, nameEnglish, startPage, ayahCount)
          ayahPages.ts           # 6,236 ayah-to-page mappings (Madani mushaf)
          constants.ts           # LINES_PER_PAGE=15, TOTAL_PAGES=604, TOTAL_AYAHS=6236, etc.
        algorithm/
          planGenerator.ts       # Orchestrator: generates full 30-assignment plan
          newMemorization.ts     # New memorization per assignment
          minorRevision.ts       # Minor revision per assignment
          majorRevision.ts       # Major revision with wraparound
          helpers.ts             # Shared utilities
          __tests__/             # Algorithm tests
        store/
          usePlanStore.ts        # Zustand store
        api/
          planService.ts         # Abstraction: local now, Django API later
      hooks/
        usePrint.ts              # react-to-print wrapper
```

**Key decision:** `frontend/` subdirectory keeps the Next.js app isolated so `backend/` (Django) can sit alongside later.

## Data Model

### Surah Metadata (`lib/quran/surahs.ts`)

Static array of 114 entries:
```ts
interface Surah {
  number: number       // 1-114
  nameArabic: string   // "الفاتحة"
  nameEnglish: string  // "Al-Fatiha" (dev convenience)
  startPage: number    // Madani mushaf page (1-604)
  ayahCount: number    // Total verses (e.g., Al-Fatiha = 7, Al-Baqarah = 286)
}
```

### Ayah-to-Page Mapping (`lib/quran/ayahPages.ts`)

Full mapping of all 6,236 ayahs to their page numbers in the Madani mushaf:
```ts
// Nested by surah for compact storage and fast lookup
// ayahPageMap[surahNumber][ayahNumber] = page number
const ayahPageMap: Record<number, Record<number, number>> = {
  1: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1 },          // Al-Fatiha: all on page 1
  2: { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 3, 7: 3, ... },      // Al-Baqarah: ayahs span many pages
  // ... all 114 surahs
}
```

Helper functions derived from this data:
- `getAyahPage(surah, ayah)` → page number
- `getAyahsOnPage(page)` → `{surah, ayah}[]`
- `getPageStartAyah(page)` → `{surah, ayah}` (first ayah on that page)

### Position Type

The algorithm tracks positions at the ayah level:
```ts
interface QuranPosition {
  surah: number    // 1-114
  ayah: number     // 1-N (varies per surah)
}
```

### Display Format

Output uses exact ayah numbers:
- **From column:** "surahName ayahNumber" → e.g., "البقرة ١"
- **To column:** "surahName ayahNumber" → e.g., "البقرة ٢٠"
- Example: "البقرة ١" → "البقرة ٢٠" (first 20 ayahs of Al-Baqarah)
- Cross-surah: "الأعلى ١" → "الغاشية ٢٦" (all of Al-A'la through all of Al-Ghashiyah)

### Core Types (`lib/quran/types.ts`)

```ts
type Direction = 'descending' | 'ascending'

interface StudentConfig {
  id: string                    // UUID
  name: string
  halaqah: string
  planType: 'independent' | 'sameAs'
  sameAsStudentId?: string

  // Memorization (independent only)
  memStartSurah: number         // surah number to start from
  memStartAyah: number          // ayah number to start from (default 1)
  linesPerSession: number
  direction: Direction

  // Revision
  minorRevPages: number         // step 0.5
  majRevStartSurah: number
  majRevStartAyah: number       // ayah number (default 1)
  majRevPages: number           // step 0.5
}

interface AssignmentRow {
  assignmentNumber: number      // 1-30
  memFrom: string | null        // "البقرة ١" format or null for "---"
  memTo: string | null          // "البقرة ٢٠" format or null
  minorFrom: string | null
  minorTo: string | null
  majorFrom: string | null
  majorTo: string | null
}

interface StudentPlan {
  studentId: string
  studentName: string
  halaqah: string
  settingsSummary: string       // Arabic summary of settings
  assignments: AssignmentRow[]  // always 30 items
}
```

## Algorithm Design

### Overview

The algorithm works at **ayah (verse) level** — it can split mid-surah. This is essential because long surahs (Al-Baqarah = 286 ayahs, 48 pages) cannot fit in a single assignment.

For each assignment (1-30), three sections are calculated sequentially. State is accumulated across iterations.

**Tracked state per iteration:**
- `memCursor` — `QuranPosition` where memorization has reached (surah + ayah)
- `majRevCursor` — `QuranPosition` where major revision has reached
- `memorizedRange` — `{start: QuranPosition, end: QuranPosition}`
- `minorRevRange` — `{start: QuranPosition, end: QuranPosition}` for current assignment

### How Page/Line Advancement Works (Ayah Level)

The core operation is: "advance N lines from position P, return the ending position."

1. Convert `linesPerSession` to pages: `pagesToAdvance = linesPerSession / 15`
2. Find current page: `currentPage = getAyahPage(cursor.surah, cursor.ayah)`
3. Calculate target page: `targetPage = currentPage + pagesToAdvance` (or minus, for descending)
4. For whole pages: find the last ayah on the target page → that's the endpoint
5. For fractional pages (e.g., 1.5 pages = 22.5 lines):
   - Find all ayahs on the fractional page
   - Include proportionally: if 0.5 page and page has 10 ayahs, include ~5 ayahs
   - Round to nearest whole ayah

### 1. New Memorization (`newMemorization.ts`)

```ts
calculateNewMemorization(
  cursor: QuranPosition,
  linesPerSession: number,
  direction: Direction,
  surahs: Surah[],
  ayahPageMap: AyahPageMap
): { from: QuranPosition, to: QuranPosition, newCursor: QuranPosition }
```

**Algorithm:**
1. Start at `cursor` position
2. Advance by `linesPerSession / 15` pages in the specified direction
3. Find the ayah at the target page boundary
4. For fractional pages, interpolate proportionally among ayahs on that page
5. Return from/to positions and new cursor (one ayah past `to`)

### 2. Minor Revision (`minorRevision.ts`)

```ts
calculateMinorRevision(
  memCursorStart: QuranPosition,
  minorRevPages: number,
  direction: Direction,
  assignmentNumber: number,
  surahs: Surah[],
  ayahPageMap: AyahPageMap
): { from: QuranPosition, to: QuranPosition } | null
```

- Assignment 1: returns `null` (displayed as "---")
- Starts from the ayah adjacent to memorization start, moves in **opposite** direction
- Covers `minorRevPages` pages worth of ayahs

### 3. Major Revision (`majorRevision.ts`)

```ts
calculateMajorRevision(
  majRevCursor: QuranPosition,
  majRevPages: number,
  direction: Direction,
  memorizedRange: { start: QuranPosition, end: QuranPosition },
  minorRevRange: { start: QuranPosition, end: QuranPosition } | null,
  surahs: Surah[],
  ayahPageMap: AyahPageMap
): { from: QuranPosition, to: QuranPosition, newCursor: QuranPosition }
```

- Moves in **opposite** direction to memorization
- Advances `majRevPages` pages per assignment
- **Non-overlap rule:** skips ayahs in memorization or minor revision range
- **Wraparound:** when reaching Quran boundary (first/last ayah), restarts from the first free ayah outside [memorization + minor revision]

### Validation Test Scenario

Settings: Start at Al-Ghashiyah ayah 1 (88:1) descending, 15 lines/session, minor=1 page, major starts Al-Fajr ayah 1 (89:1) with 3 pages.

| # | Memorize From | Memorize To | Minor Rev | Major Rev |
|---|---|---|---|---|
| 1 | الغاشية ١ | الغاشية ٢٦ | --- | الفجر ١ → الليل ٢١ |
| 2 | الأعلى ١ | الأعلى ١٩ | الغاشية ١ → الغاشية ٢٦ | الضحى ١ → العلق ١٩ |
| 6 | عبس ١ | عبس ٤٢ | المطففين ١ → المطففين ٣٦ | **البروج ١** (restart!) |

Assignment 6 is the critical test: major revision restarts from Al-Burooj (85:1) because minor revision covers through Al-Inshiqaq (84).

## State Management

**Zustand** with `persist` middleware using `sessionStorage`:

```ts
interface PlanStore {
  students: StudentConfig[]
  addStudent: () => void
  removeStudent: (id: string) => void
  updateStudent: (id: string, updates: Partial<StudentConfig>) => void

  plans: StudentPlan[]
  generateAllPlans: () => void
  clearPlans: () => void

  isGenerating: boolean
}
```

- Persists `students` and `plans` to sessionStorage
- Survives page navigation (Setup ↔ Preview)
- Auto-clears on tab close

## UI Design

### Setup Page (`/setup`)

- Title: "صانع الخطط القرآنية"
- Student cards with:
  - Name + Halaqah inputs
  - Plan type: "خطة مستقلة" or "نفس خطة طالب آخر"
  - If independent: memorization settings (start surah, lines/session, direction) + revision settings (minor pages, major start surah, major pages)
- "إضافة طالب" button
- "توليد الخطط" button → generates plans → navigates to /preview

### Preview Page (`/preview`)

- Back button → /setup
- Print/Download PDF button
- Per-student: PlanHeader + PlanTable (30 rows × 8 columns) + PlanFooter

### Design Tokens

- Primary: navy (#1a3347) + gold (#c9933a)
- White cards with subtle shadow
- RTL Arabic throughout
- Responsive layout

### PDF Table Styling

**Column header colors:**
- Memorization: dark green (#1b5e20)
- Minor revision: dark blue (#0d47a1)
- Major revision: dark brown (#6d4c41)

**Row band colors:**
- Rows 1-10: white
- Rows 11-20: light green (#e8f5e9)
- Rows 21-30: light orange (#fff3e0)

**Footer:** "بارك الله فيك ووفقك للإنجاز والتفوق"

Page break between each student's table.

## Print/PDF Strategy

- **react-to-print** triggers browser's native print dialog
- **@media print CSS:**
  - `@page { size: A4 portrait; margin: 10mm 12mm; }`
  - `print-color-adjust: exact` preserves background colors
  - `.no-print { display: none }` hides UI controls
  - `page-break-before: always` between students
  - `thead { display: table-header-group }` repeats headers
- **Amiri font** (self-hosted in /public/fonts/) for consistent Arabic rendering

## Future Backend Integration

`lib/api/planService.ts` provides an async interface:

```ts
interface PlanService {
  generatePlan(config: StudentConfig): Promise<StudentPlan>
  generateBatchPlans(configs: StudentConfig[]): Promise<StudentPlan[]>
}
```

**Phase 1 (now):** Calls local algorithm directly.
**Phase 2 (Django):** Switches to `fetch('/api/plans/generate/')`. Controlled by `NEXT_PUBLIC_USE_LOCAL_ALGORITHM` env variable. Zero component changes needed.

## Testing Strategy

**Vitest** for all tests:

### Algorithm Tests (critical priority)
- `newMemorization.test.ts` — page advancement, mid-surah splitting, fractional pages, boundary ayahs
- `minorRevision.test.ts` — assignment 1 returns null, fractional pages, direction correctness
- `majorRevision.test.ts` — non-overlap, **wraparound scenario** (assignment 6 from Al-Burooj)
- `planGenerator.test.ts` — full 30-assignment generation, "sameAs" students
- `data.test.ts` — 114 surahs correct, 6236 total ayahs, page mapping integrity, no gaps

### Component Tests (secondary)
- StudentCard: renders fields, updates store
- PlanTable: 30 rows, correct color bands, "---" for nulls
- SurahSelect: 114 options, correct onChange

## Implementation Order

1. **Data layer** — types.ts, constants.ts, data.ts (114 surahs)
2. **Algorithm** — helpers, newMemorization, minorRevision, majorRevision, planGenerator
3. **Algorithm tests** — validate with the test scenario
4. **Next.js scaffold** — layout, setup page, preview page
5. **Zustand store** — usePlanStore with persist
6. **Setup UI** — StudentCard, settings components
7. **Preview UI** — PlanTable, PrintableSheet
8. **Print CSS** — @media print styles, react-to-print integration
9. **Polish** — responsive design, font loading, validation
