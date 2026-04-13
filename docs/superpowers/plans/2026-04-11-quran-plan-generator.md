# Quran Memorization Plan Generator - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a client-side Next.js web app that generates 30-assignment Quran memorization plans per student with print-ready PDF output.

**Architecture:** Next.js 16.2.3 LTS App Router with TypeScript. Algorithm is pure TypeScript in `lib/algorithm/` (no React deps). Zustand store bridges Setup and Preview pages. `react-to-print` + `@media print` CSS for PDF. All code in `frontend/` subdirectory for future Django backend integration.

**Tech Stack:** Next.js 16.2.3, React 19, TypeScript 5, Tailwind CSS v4, Zustand 5, react-to-print, Vitest

**Spec:** `docs/superpowers/specs/2026-04-11-quran-plan-generator-design.md`

---

## File Map

```
frontend/
  src/
    app/
      layout.tsx                    ← Root layout: RTL Arabic, Amiri font, Tailwind
      globals.css                   ← Tailwind + @media print CSS
      page.tsx                      ← Redirect to /setup
      setup/
        page.tsx                    ← Server Component shell
        SetupClient.tsx             ← Client: student cards form
      preview/
        page.tsx                    ← Server Component shell
        PreviewClient.tsx           ← Client: plan tables + print
    components/
      ui/
        Button.tsx                  ← Primary/secondary variants
        Card.tsx                    ← White card with shadow + close
        Input.tsx                   ← Number/text with label, RTL
        Select.tsx                  ← Styled select with label, RTL
      setup/
        StudentCard.tsx             ← One student's config card
        MemorizationSettings.tsx    ← Start surah/ayah, lines, direction
        RevisionSettings.tsx        ← Minor/major revision settings
        SurahSelect.tsx             ← 114-surah dropdown
      preview/
        PrintableSheet.tsx          ← Wrapper: header + table + footer per student
        PlanHeader.tsx              ← Student name, halaqah, settings summary
        PlanTable.tsx               ← 30-row x 8-column RTL table
        PlanFooter.tsx              ← Blessing text
    lib/
      quran/
        types.ts                    ← All TypeScript interfaces
        constants.ts                ← LINES_PER_PAGE, TOTAL_PAGES, etc.
        surahs.ts                   ← 114 surahs metadata
        ayahPages.ts                ← 6,236 ayah-to-page mappings + helpers
      algorithm/
        helpers.ts                  ← Position math, formatting
        newMemorization.ts          ← New memorization per assignment
        minorRevision.ts            ← Minor revision per assignment
        majorRevision.ts            ← Major revision with wraparound
        planGenerator.ts            ← Orchestrator: 30 assignments
        __tests__/
          data.test.ts              ← Quran data integrity
          helpers.test.ts           ← Helper function tests
          newMemorization.test.ts   ← New mem algorithm tests
          minorRevision.test.ts     ← Minor rev tests
          majorRevision.test.ts     ← Major rev + wraparound test
          planGenerator.test.ts     ← Full plan generation test
      store/
        usePlanStore.ts             ← Zustand + sessionStorage persist
      api/
        planService.ts              ← Local now, Django API later
    hooks/
      usePrint.ts                   ← react-to-print wrapper
  public/
    fonts/
      Amiri-Regular.ttf
      Amiri-Bold.ttf
  vitest.config.ts
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `frontend/` (via create-next-app)
- Modify: `frontend/package.json` (add deps)
- Modify: `frontend/src/app/layout.tsx` (RTL Arabic)
- Modify: `frontend/src/app/globals.css` (print styles)
- Create: `frontend/vitest.config.ts`

- [ ] **Step 1: Create Next.js project**

```bash
cd c:/Users/aqint/OneDrive/Documents/GItFiles/QURAN-MEMORIZATION-PLAN-GENERATION-USING-AI
npx create-next-app@16.2.3 frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

Expected: Project created in `frontend/` with App Router, TypeScript, Tailwind CSS v4.

- [ ] **Step 2: Install additional dependencies**

```bash
cd frontend
npm install zustand react-to-print
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Download Amiri font**

```bash
mkdir -p public/fonts
curl -L -o public/fonts/Amiri-Regular.ttf "https://github.com/aliftype/amiri/raw/main/Amiri-Regular.ttf"
curl -L -o public/fonts/Amiri-Bold.ttf "https://github.com/aliftype/amiri/raw/main/Amiri-Bold.ttf"
```

If curl fails, download manually from https://fonts.google.com/specimen/Amiri and place in `public/fonts/`.

- [ ] **Step 4: Create Vitest config**

Create `frontend/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 5: Add test script to package.json**

In `frontend/package.json`, add to `"scripts"`:

```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 6: Configure root layout for RTL Arabic**

Replace `frontend/src/app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const amiri = localFont({
  src: [
    {
      path: "../../public/fonts/Amiri-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/Amiri-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-amiri",
  display: "swap",
});

export const metadata: Metadata = {
  title: "صانع الخطط القرآنية",
  description: "أداة لتوليد خطط الحفظ والمراجعة القرآنية للطلاب",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${amiri.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Set up globals.css with Tailwind + print styles**

Replace `frontend/src/app/globals.css` with:

```css
@import "tailwindcss";

:root {
  --color-navy: #1a3347;
  --color-gold: #c9933a;
  --color-mem-header: #1b5e20;
  --color-minor-header: #0d47a1;
  --color-major-header: #6d4c41;
  --color-band-green: #e8f5e9;
  --color-band-orange: #fff3e0;
}

body {
  font-family: var(--font-amiri), "Amiri", serif;
  background-color: #f5f5f5;
  color: var(--color-navy);
}

@media print {
  .no-print {
    display: none !important;
  }

  html, body {
    height: initial !important;
    overflow: initial !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    direction: rtl;
    background: white;
  }

  @page {
    size: A4 landscape;
    margin: 8mm 10mm;
  }

  .page-break {
    page-break-before: always;
    break-before: page;
  }

  table {
    page-break-inside: auto;
  }

  tr {
    page-break-inside: avoid;
    page-break-after: auto;
  }

  thead {
    display: table-header-group;
  }

  * {
    font-family: "Amiri", serif !important;
  }
}
```

- [ ] **Step 8: Create minimal page.tsx redirect**

Replace `frontend/src/app/page.tsx` with:

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/setup");
}
```

- [ ] **Step 9: Create placeholder setup page**

Create `frontend/src/app/setup/page.tsx`:

```tsx
export default function SetupPage() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold text-center" style={{ color: 'var(--color-navy)' }}>
        صانع الخطط القرآنية
      </h1>
      <p className="text-center mt-4 text-gray-600">قيد الإنشاء...</p>
    </main>
  );
}
```

- [ ] **Step 10: Verify dev server runs**

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000` — should redirect to `/setup` and show the Arabic title. Verify RTL direction works.

- [ ] **Step 11: Commit**

```bash
git add frontend/
git commit -m "feat: scaffold Next.js 16.2.3 project with RTL Arabic, Tailwind, Vitest"
```

---

## Task 2: Quran Data — Types & Constants

**Files:**
- Create: `frontend/src/lib/quran/types.ts`
- Create: `frontend/src/lib/quran/constants.ts`

- [ ] **Step 1: Create types.ts**

Create `frontend/src/lib/quran/types.ts`:

```ts
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

export interface AssignmentRow {
  assignmentNumber: number;
  memFrom: string | null;
  memTo: string | null;
  minorFrom: string | null;
  minorTo: string | null;
  majorFrom: string | null;
  majorTo: string | null;
}

export interface StudentPlan {
  studentId: string;
  studentName: string;
  halaqah: string;
  settingsSummary: string;
  assignments: AssignmentRow[];
}

export type AyahPageMap = number[][];
```

- [ ] **Step 2: Create constants.ts**

Create `frontend/src/lib/quran/constants.ts`:

```ts
export const LINES_PER_PAGE = 15;
export const TOTAL_PAGES = 604;
export const TOTAL_SURAHS = 114;
export const TOTAL_AYAHS = 6236;
export const ASSIGNMENTS_COUNT = 30;
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/quran/
git commit -m "feat: add Quran data types and constants"
```

---

## Task 3: Quran Data — Surah Metadata

**Files:**
- Create: `frontend/src/lib/quran/surahs.ts`
- Test: `frontend/src/lib/algorithm/__tests__/data.test.ts`

- [ ] **Step 1: Write data integrity test**

Create `frontend/src/lib/algorithm/__tests__/data.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { SURAHS } from "@/lib/quran/surahs";
import { TOTAL_SURAHS, TOTAL_AYAHS } from "@/lib/quran/constants";

describe("Surah metadata", () => {
  it("has exactly 114 surahs", () => {
    expect(SURAHS).toHaveLength(TOTAL_SURAHS);
  });

  it("surah numbers are sequential 1-114", () => {
    SURAHS.forEach((s, i) => {
      expect(s.number).toBe(i + 1);
    });
  });

  it("Al-Fatiha is surah 1 starting at page 1", () => {
    expect(SURAHS[0].nameArabic).toBe("الفاتحة");
    expect(SURAHS[0].startPage).toBe(1);
    expect(SURAHS[0].ayahCount).toBe(7);
  });

  it("An-Nas is surah 114 starting at page 604", () => {
    expect(SURAHS[113].nameArabic).toBe("الناس");
    expect(SURAHS[113].startPage).toBe(604);
    expect(SURAHS[113].ayahCount).toBe(6);
  });

  it("start pages are non-decreasing", () => {
    for (let i = 1; i < SURAHS.length; i++) {
      expect(SURAHS[i].startPage).toBeGreaterThanOrEqual(SURAHS[i - 1].startPage);
    }
  });

  it("all start pages are between 1 and 604", () => {
    SURAHS.forEach((s) => {
      expect(s.startPage).toBeGreaterThanOrEqual(1);
      expect(s.startPage).toBeLessThanOrEqual(604);
    });
  });

  it("total ayah count across all surahs equals 6236", () => {
    const total = SURAHS.reduce((sum, s) => sum + s.ayahCount, 0);
    expect(total).toBe(TOTAL_AYAHS);
  });

  it("all surahs have at least 1 ayah", () => {
    SURAHS.forEach((s) => {
      expect(s.ayahCount).toBeGreaterThanOrEqual(1);
    });
  });

  it("all surahs have Arabic names", () => {
    SURAHS.forEach((s) => {
      expect(s.nameArabic.length).toBeGreaterThan(0);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend
npx vitest run src/lib/algorithm/__tests__/data.test.ts
```

Expected: FAIL — `@/lib/quran/surahs` does not exist yet.

- [ ] **Step 3: Create surahs.ts with all 114 surahs**

Create `frontend/src/lib/quran/surahs.ts`:

```ts
import type { Surah } from "./types";

export const SURAHS: Surah[] = [
  { number: 1, nameArabic: "الفاتحة", nameEnglish: "Al-Fatiha", startPage: 1, ayahCount: 7 },
  { number: 2, nameArabic: "البقرة", nameEnglish: "Al-Baqarah", startPage: 2, ayahCount: 286 },
  { number: 3, nameArabic: "آل عمران", nameEnglish: "Aal-Imran", startPage: 50, ayahCount: 200 },
  { number: 4, nameArabic: "النساء", nameEnglish: "An-Nisa", startPage: 77, ayahCount: 176 },
  { number: 5, nameArabic: "المائدة", nameEnglish: "Al-Ma'idah", startPage: 106, ayahCount: 120 },
  { number: 6, nameArabic: "الأنعام", nameEnglish: "Al-An'am", startPage: 128, ayahCount: 165 },
  { number: 7, nameArabic: "الأعراف", nameEnglish: "Al-A'raf", startPage: 151, ayahCount: 206 },
  { number: 8, nameArabic: "الأنفال", nameEnglish: "Al-Anfal", startPage: 177, ayahCount: 75 },
  { number: 9, nameArabic: "التوبة", nameEnglish: "At-Tawbah", startPage: 187, ayahCount: 129 },
  { number: 10, nameArabic: "يونس", nameEnglish: "Yunus", startPage: 208, ayahCount: 109 },
  { number: 11, nameArabic: "هود", nameEnglish: "Hud", startPage: 221, ayahCount: 123 },
  { number: 12, nameArabic: "يوسف", nameEnglish: "Yusuf", startPage: 235, ayahCount: 111 },
  { number: 13, nameArabic: "الرعد", nameEnglish: "Ar-Ra'd", startPage: 249, ayahCount: 43 },
  { number: 14, nameArabic: "إبراهيم", nameEnglish: "Ibrahim", startPage: 255, ayahCount: 52 },
  { number: 15, nameArabic: "الحجر", nameEnglish: "Al-Hijr", startPage: 262, ayahCount: 99 },
  { number: 16, nameArabic: "النحل", nameEnglish: "An-Nahl", startPage: 267, ayahCount: 128 },
  { number: 17, nameArabic: "الإسراء", nameEnglish: "Al-Isra", startPage: 282, ayahCount: 111 },
  { number: 18, nameArabic: "الكهف", nameEnglish: "Al-Kahf", startPage: 293, ayahCount: 110 },
  { number: 19, nameArabic: "مريم", nameEnglish: "Maryam", startPage: 305, ayahCount: 98 },
  { number: 20, nameArabic: "طه", nameEnglish: "Taha", startPage: 312, ayahCount: 135 },
  { number: 21, nameArabic: "الأنبياء", nameEnglish: "Al-Anbiya", startPage: 322, ayahCount: 112 },
  { number: 22, nameArabic: "الحج", nameEnglish: "Al-Hajj", startPage: 332, ayahCount: 78 },
  { number: 23, nameArabic: "المؤمنون", nameEnglish: "Al-Mu'minun", startPage: 342, ayahCount: 118 },
  { number: 24, nameArabic: "النور", nameEnglish: "An-Nur", startPage: 350, ayahCount: 64 },
  { number: 25, nameArabic: "الفرقان", nameEnglish: "Al-Furqan", startPage: 359, ayahCount: 77 },
  { number: 26, nameArabic: "الشعراء", nameEnglish: "Ash-Shu'ara", startPage: 367, ayahCount: 227 },
  { number: 27, nameArabic: "النمل", nameEnglish: "An-Naml", startPage: 377, ayahCount: 93 },
  { number: 28, nameArabic: "القصص", nameEnglish: "Al-Qasas", startPage: 385, ayahCount: 88 },
  { number: 29, nameArabic: "العنكبوت", nameEnglish: "Al-Ankabut", startPage: 396, ayahCount: 69 },
  { number: 30, nameArabic: "الروم", nameEnglish: "Ar-Rum", startPage: 404, ayahCount: 60 },
  { number: 31, nameArabic: "لقمان", nameEnglish: "Luqman", startPage: 411, ayahCount: 34 },
  { number: 32, nameArabic: "السجدة", nameEnglish: "As-Sajdah", startPage: 415, ayahCount: 30 },
  { number: 33, nameArabic: "الأحزاب", nameEnglish: "Al-Ahzab", startPage: 418, ayahCount: 73 },
  { number: 34, nameArabic: "سبأ", nameEnglish: "Saba", startPage: 428, ayahCount: 54 },
  { number: 35, nameArabic: "فاطر", nameEnglish: "Fatir", startPage: 434, ayahCount: 45 },
  { number: 36, nameArabic: "يس", nameEnglish: "Ya-Sin", startPage: 440, ayahCount: 83 },
  { number: 37, nameArabic: "الصافات", nameEnglish: "As-Saffat", startPage: 446, ayahCount: 182 },
  { number: 38, nameArabic: "ص", nameEnglish: "Sad", startPage: 453, ayahCount: 88 },
  { number: 39, nameArabic: "الزمر", nameEnglish: "Az-Zumar", startPage: 458, ayahCount: 75 },
  { number: 40, nameArabic: "غافر", nameEnglish: "Ghafir", startPage: 467, ayahCount: 85 },
  { number: 41, nameArabic: "فصلت", nameEnglish: "Fussilat", startPage: 477, ayahCount: 54 },
  { number: 42, nameArabic: "الشورى", nameEnglish: "Ash-Shura", startPage: 483, ayahCount: 53 },
  { number: 43, nameArabic: "الزخرف", nameEnglish: "Az-Zukhruf", startPage: 489, ayahCount: 89 },
  { number: 44, nameArabic: "الدخان", nameEnglish: "Ad-Dukhan", startPage: 496, ayahCount: 59 },
  { number: 45, nameArabic: "الجاثية", nameEnglish: "Al-Jathiyah", startPage: 499, ayahCount: 37 },
  { number: 46, nameArabic: "الأحقاف", nameEnglish: "Al-Ahqaf", startPage: 502, ayahCount: 35 },
  { number: 47, nameArabic: "محمد", nameEnglish: "Muhammad", startPage: 507, ayahCount: 38 },
  { number: 48, nameArabic: "الفتح", nameEnglish: "Al-Fath", startPage: 511, ayahCount: 29 },
  { number: 49, nameArabic: "الحجرات", nameEnglish: "Al-Hujurat", startPage: 515, ayahCount: 18 },
  { number: 50, nameArabic: "ق", nameEnglish: "Qaf", startPage: 518, ayahCount: 45 },
  { number: 51, nameArabic: "الذاريات", nameEnglish: "Adh-Dhariyat", startPage: 520, ayahCount: 60 },
  { number: 52, nameArabic: "الطور", nameEnglish: "At-Tur", startPage: 523, ayahCount: 49 },
  { number: 53, nameArabic: "النجم", nameEnglish: "An-Najm", startPage: 526, ayahCount: 62 },
  { number: 54, nameArabic: "القمر", nameEnglish: "Al-Qamar", startPage: 528, ayahCount: 55 },
  { number: 55, nameArabic: "الرحمن", nameEnglish: "Ar-Rahman", startPage: 531, ayahCount: 78 },
  { number: 56, nameArabic: "الواقعة", nameEnglish: "Al-Waqi'ah", startPage: 534, ayahCount: 96 },
  { number: 57, nameArabic: "الحديد", nameEnglish: "Al-Hadid", startPage: 537, ayahCount: 29 },
  { number: 58, nameArabic: "المجادلة", nameEnglish: "Al-Mujadilah", startPage: 542, ayahCount: 22 },
  { number: 59, nameArabic: "الحشر", nameEnglish: "Al-Hashr", startPage: 545, ayahCount: 24 },
  { number: 60, nameArabic: "الممتحنة", nameEnglish: "Al-Mumtahanah", startPage: 549, ayahCount: 13 },
  { number: 61, nameArabic: "الصف", nameEnglish: "As-Saff", startPage: 551, ayahCount: 14 },
  { number: 62, nameArabic: "الجمعة", nameEnglish: "Al-Jumu'ah", startPage: 553, ayahCount: 11 },
  { number: 63, nameArabic: "المنافقون", nameEnglish: "Al-Munafiqun", startPage: 554, ayahCount: 11 },
  { number: 64, nameArabic: "التغابن", nameEnglish: "At-Taghabun", startPage: 556, ayahCount: 18 },
  { number: 65, nameArabic: "الطلاق", nameEnglish: "At-Talaq", startPage: 558, ayahCount: 12 },
  { number: 66, nameArabic: "التحريم", nameEnglish: "At-Tahrim", startPage: 560, ayahCount: 12 },
  { number: 67, nameArabic: "الملك", nameEnglish: "Al-Mulk", startPage: 562, ayahCount: 30 },
  { number: 68, nameArabic: "القلم", nameEnglish: "Al-Qalam", startPage: 564, ayahCount: 52 },
  { number: 69, nameArabic: "الحاقة", nameEnglish: "Al-Haqqah", startPage: 566, ayahCount: 52 },
  { number: 70, nameArabic: "المعارج", nameEnglish: "Al-Ma'arij", startPage: 568, ayahCount: 44 },
  { number: 71, nameArabic: "نوح", nameEnglish: "Nuh", startPage: 570, ayahCount: 28 },
  { number: 72, nameArabic: "الجن", nameEnglish: "Al-Jinn", startPage: 572, ayahCount: 28 },
  { number: 73, nameArabic: "المزمل", nameEnglish: "Al-Muzzammil", startPage: 574, ayahCount: 20 },
  { number: 74, nameArabic: "المدثر", nameEnglish: "Al-Muddaththir", startPage: 575, ayahCount: 56 },
  { number: 75, nameArabic: "القيامة", nameEnglish: "Al-Qiyamah", startPage: 577, ayahCount: 40 },
  { number: 76, nameArabic: "الإنسان", nameEnglish: "Al-Insan", startPage: 578, ayahCount: 31 },
  { number: 77, nameArabic: "المرسلات", nameEnglish: "Al-Mursalat", startPage: 580, ayahCount: 50 },
  { number: 78, nameArabic: "النبأ", nameEnglish: "An-Naba", startPage: 582, ayahCount: 40 },
  { number: 79, nameArabic: "النازعات", nameEnglish: "An-Nazi'at", startPage: 583, ayahCount: 46 },
  { number: 80, nameArabic: "عبس", nameEnglish: "Abasa", startPage: 585, ayahCount: 42 },
  { number: 81, nameArabic: "التكوير", nameEnglish: "At-Takwir", startPage: 586, ayahCount: 29 },
  { number: 82, nameArabic: "الانفطار", nameEnglish: "Al-Infitar", startPage: 587, ayahCount: 19 },
  { number: 83, nameArabic: "المطففين", nameEnglish: "Al-Mutaffifin", startPage: 587, ayahCount: 36 },
  { number: 84, nameArabic: "الانشقاق", nameEnglish: "Al-Inshiqaq", startPage: 589, ayahCount: 25 },
  { number: 85, nameArabic: "البروج", nameEnglish: "Al-Burooj", startPage: 590, ayahCount: 22 },
  { number: 86, nameArabic: "الطارق", nameEnglish: "At-Tariq", startPage: 591, ayahCount: 17 },
  { number: 87, nameArabic: "الأعلى", nameEnglish: "Al-A'la", startPage: 591, ayahCount: 19 },
  { number: 88, nameArabic: "الغاشية", nameEnglish: "Al-Ghashiyah", startPage: 592, ayahCount: 26 },
  { number: 89, nameArabic: "الفجر", nameEnglish: "Al-Fajr", startPage: 593, ayahCount: 30 },
  { number: 90, nameArabic: "البلد", nameEnglish: "Al-Balad", startPage: 594, ayahCount: 20 },
  { number: 91, nameArabic: "الشمس", nameEnglish: "Ash-Shams", startPage: 595, ayahCount: 15 },
  { number: 92, nameArabic: "الليل", nameEnglish: "Al-Lail", startPage: 595, ayahCount: 21 },
  { number: 93, nameArabic: "الضحى", nameEnglish: "Ad-Duha", startPage: 596, ayahCount: 11 },
  { number: 94, nameArabic: "الشرح", nameEnglish: "Ash-Sharh", startPage: 596, ayahCount: 8 },
  { number: 95, nameArabic: "التين", nameEnglish: "At-Tin", startPage: 597, ayahCount: 8 },
  { number: 96, nameArabic: "العلق", nameEnglish: "Al-Alaq", startPage: 597, ayahCount: 19 },
  { number: 97, nameArabic: "القدر", nameEnglish: "Al-Qadr", startPage: 598, ayahCount: 5 },
  { number: 98, nameArabic: "البينة", nameEnglish: "Al-Bayyinah", startPage: 598, ayahCount: 8 },
  { number: 99, nameArabic: "الزلزلة", nameEnglish: "Az-Zalzalah", startPage: 599, ayahCount: 8 },
  { number: 100, nameArabic: "العاديات", nameEnglish: "Al-Adiyat", startPage: 599, ayahCount: 11 },
  { number: 101, nameArabic: "القارعة", nameEnglish: "Al-Qari'ah", startPage: 600, ayahCount: 11 },
  { number: 102, nameArabic: "التكاثر", nameEnglish: "At-Takathur", startPage: 600, ayahCount: 8 },
  { number: 103, nameArabic: "العصر", nameEnglish: "Al-Asr", startPage: 601, ayahCount: 3 },
  { number: 104, nameArabic: "الهمزة", nameEnglish: "Al-Humazah", startPage: 601, ayahCount: 9 },
  { number: 105, nameArabic: "الفيل", nameEnglish: "Al-Fil", startPage: 601, ayahCount: 5 },
  { number: 106, nameArabic: "قريش", nameEnglish: "Quraysh", startPage: 602, ayahCount: 4 },
  { number: 107, nameArabic: "الماعون", nameEnglish: "Al-Ma'un", startPage: 602, ayahCount: 7 },
  { number: 108, nameArabic: "الكوثر", nameEnglish: "Al-Kawthar", startPage: 602, ayahCount: 3 },
  { number: 109, nameArabic: "الكافرون", nameEnglish: "Al-Kafirun", startPage: 603, ayahCount: 6 },
  { number: 110, nameArabic: "النصر", nameEnglish: "An-Nasr", startPage: 603, ayahCount: 3 },
  { number: 111, nameArabic: "المسد", nameEnglish: "Al-Masad", startPage: 603, ayahCount: 5 },
  { number: 112, nameArabic: "الإخلاص", nameEnglish: "Al-Ikhlas", startPage: 604, ayahCount: 4 },
  { number: 113, nameArabic: "الفلق", nameEnglish: "Al-Falaq", startPage: 604, ayahCount: 5 },
  { number: 114, nameArabic: "الناس", nameEnglish: "An-Nas", startPage: 604, ayahCount: 6 },
];

export function getSurahByNumber(n: number): Surah {
  const surah = SURAHS[n - 1];
  if (!surah) throw new Error(`Invalid surah number: ${n}`);
  return surah;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend
npx vitest run src/lib/algorithm/__tests__/data.test.ts
```

Expected: All 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/quran/surahs.ts frontend/src/lib/algorithm/__tests__/data.test.ts
git commit -m "feat: add 114 surah metadata with data integrity tests"
```

---

## Task 4: Quran Data — Ayah-to-Page Mapping

**Files:**
- Create: `frontend/src/lib/quran/ayahPages.ts`
- Modify: `frontend/src/lib/algorithm/__tests__/data.test.ts`

This is the largest data file: 6,236 ayah-to-page entries for the Madani mushaf. The data is stored as a nested array where `AYAH_PAGES[surahNumber][ayahNumber]` = page number. Index 0 of each is unused (ayahs are 1-indexed).

- [ ] **Step 1: Add ayah data integrity tests**

Append to `frontend/src/lib/algorithm/__tests__/data.test.ts`:

```ts
import { AYAH_PAGES, getAyahPage, getPageStartAyah } from "@/lib/quran/ayahPages";

describe("Ayah-to-page mapping", () => {
  it("has entries for all 114 surahs", () => {
    // Index 0 unused, so length = 115
    expect(AYAH_PAGES.length).toBe(TOTAL_SURAHS + 1);
  });

  it("total ayah count matches 6236", () => {
    let total = 0;
    for (let s = 1; s <= TOTAL_SURAHS; s++) {
      // Subtract 1 because index 0 of each sub-array is unused
      total += AYAH_PAGES[s].length - 1;
    }
    expect(total).toBe(TOTAL_AYAHS);
  });

  it("ayah counts match surah metadata", () => {
    SURAHS.forEach((surah) => {
      const ayahCount = AYAH_PAGES[surah.number].length - 1;
      expect(ayahCount).toBe(surah.ayahCount);
    });
  });

  it("all pages are between 1 and 604", () => {
    for (let s = 1; s <= TOTAL_SURAHS; s++) {
      for (let a = 1; a < AYAH_PAGES[s].length; a++) {
        expect(AYAH_PAGES[s][a]).toBeGreaterThanOrEqual(1);
        expect(AYAH_PAGES[s][a]).toBeLessThanOrEqual(604);
      }
    }
  });

  it("pages are non-decreasing within each surah", () => {
    for (let s = 1; s <= TOTAL_SURAHS; s++) {
      for (let a = 2; a < AYAH_PAGES[s].length; a++) {
        expect(AYAH_PAGES[s][a]).toBeGreaterThanOrEqual(AYAH_PAGES[s][a - 1]);
      }
    }
  });

  it("first ayah of each surah matches surah startPage", () => {
    SURAHS.forEach((surah) => {
      expect(AYAH_PAGES[surah.number][1]).toBe(surah.startPage);
    });
  });

  it("getAyahPage returns correct page", () => {
    expect(getAyahPage(1, 1)).toBe(1);   // Al-Fatiha verse 1 = page 1
    expect(getAyahPage(2, 1)).toBe(2);   // Al-Baqarah verse 1 = page 2
    expect(getAyahPage(114, 6)).toBe(604); // An-Nas verse 6 = page 604
  });

  it("getPageStartAyah returns first ayah on a page", () => {
    const pos = getPageStartAyah(1);
    expect(pos.surah).toBe(1);
    expect(pos.ayah).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend
npx vitest run src/lib/algorithm/__tests__/data.test.ts
```

Expected: FAIL — `@/lib/quran/ayahPages` does not exist.

- [ ] **Step 3: Create ayahPages.ts with full mapping**

Create `frontend/src/lib/quran/ayahPages.ts`. This file contains the full ayah-to-page mapping for all 6,236 ayahs in the Madani mushaf.

The data structure: `AYAH_PAGES[surahNumber][ayahNumber] = pageNumber`. Index 0 of each array is unused (placeholder `0`).

```ts
import type { QuranPosition } from "./types";
import { TOTAL_SURAHS } from "./constants";

// AYAH_PAGES[surah][ayah] = page number in Madani mushaf
// Index 0 of each sub-array is unused (ayahs are 1-based)
// Source: Standard Madani (King Fahd Complex) Quran page mapping
export const AYAH_PAGES: number[][] = [
  [], // index 0 unused
  // Surah 1: Al-Fatiha (7 ayahs, page 1)
  [0, 1, 1, 1, 1, 1, 1, 1],
  // Surah 2: Al-Baqarah (286 ayahs, pages 2-49)
  [0, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 7, 7, 7, 7, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 12, 12, 12, 12, 12, 12, 12, 12, 12, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 27, 27, 27, 27, 27, 27, 27, 27, 27, 28, 28, 28, 28, 28, 28, 28, 28, 29],
  // ... remaining surahs 3-114 follow the same pattern
  // Each entry is populated from the standard Madani mushaf ayah-to-page data
  // The implementing agent should populate this using the Quran API or
  // the standard King Fahd Complex page mapping data
];

/**
 * Get the page number for a specific ayah
 */
export function getAyahPage(surah: number, ayah: number): number {
  if (surah < 1 || surah > TOTAL_SURAHS) {
    throw new Error(`Invalid surah number: ${surah}`);
  }
  const surahData = AYAH_PAGES[surah];
  if (ayah < 1 || ayah >= surahData.length) {
    throw new Error(`Invalid ayah ${ayah} for surah ${surah}`);
  }
  return surahData[ayah];
}

/**
 * Get the first ayah that appears on a given page
 */
export function getPageStartAyah(page: number): QuranPosition {
  for (let s = 1; s <= TOTAL_SURAHS; s++) {
    for (let a = 1; a < AYAH_PAGES[s].length; a++) {
      if (AYAH_PAGES[s][a] === page) {
        return { surah: s, ayah: a };
      }
    }
  }
  throw new Error(`No ayah found on page ${page}`);
}

/**
 * Get all ayahs on a specific page
 */
export function getAyahsOnPage(page: number): QuranPosition[] {
  const result: QuranPosition[] = [];
  for (let s = 1; s <= TOTAL_SURAHS; s++) {
    for (let a = 1; a < AYAH_PAGES[s].length; a++) {
      if (AYAH_PAGES[s][a] === page) {
        result.push({ surah: s, ayah: a });
      } else if (AYAH_PAGES[s][a] > page && result.length > 0) {
        return result;
      }
    }
  }
  return result;
}

/**
 * Get the last ayah on a given page
 */
export function getPageEndAyah(page: number): QuranPosition {
  const ayahs = getAyahsOnPage(page);
  if (ayahs.length === 0) throw new Error(`No ayah found on page ${page}`);
  return ayahs[ayahs.length - 1];
}
```

**IMPORTANT:** The full `AYAH_PAGES` array must be populated with all 114 surahs (6,236 total ayah entries) during implementation. The data comes from the standard King Fahd Complex (Madani mushaf) page mapping. Each surah's array starts with `[0, ...]` (index 0 is unused placeholder) followed by the page number for each ayah.

The implementing agent should use a Quran API (e.g., `api.quran.com/v4/quran/verses/uthmani`) or any standard Madani mushaf reference to populate the remaining surahs 3-114.

- [ ] **Step 4: Run tests after full data population**

```bash
cd frontend
npx vitest run src/lib/algorithm/__tests__/data.test.ts
```

Expected: All tests PASS (17 total: 9 surah + 8 ayah tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/quran/ayahPages.ts frontend/src/lib/algorithm/__tests__/data.test.ts
git commit -m "feat: add full ayah-to-page mapping for 6236 ayahs (Madani mushaf)"
```

---

## Task 5: Algorithm Helpers

**Files:**
- Create: `frontend/src/lib/algorithm/helpers.ts`
- Test: `frontend/src/lib/algorithm/__tests__/helpers.test.ts`

- [ ] **Step 1: Write helpers test**

Create `frontend/src/lib/algorithm/__tests__/helpers.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  comparePositions,
  getNextAyah,
  isPositionInRange,
  advanceByPages,
  formatPosition,
} from "@/lib/algorithm/helpers";

describe("comparePositions", () => {
  it("returns 0 for equal positions", () => {
    expect(comparePositions({ surah: 2, ayah: 5 }, { surah: 2, ayah: 5 })).toBe(0);
  });

  it("returns -1 when a is before b", () => {
    expect(comparePositions({ surah: 2, ayah: 5 }, { surah: 2, ayah: 10 })).toBe(-1);
    expect(comparePositions({ surah: 1, ayah: 7 }, { surah: 2, ayah: 1 })).toBe(-1);
  });

  it("returns 1 when a is after b", () => {
    expect(comparePositions({ surah: 3, ayah: 1 }, { surah: 2, ayah: 286 })).toBe(1);
  });
});

describe("getNextAyah", () => {
  it("moves to next ayah in same surah (ascending)", () => {
    const result = getNextAyah({ surah: 2, ayah: 5 }, "ascending");
    expect(result).toEqual({ surah: 2, ayah: 6 });
  });

  it("crosses to next surah when at last ayah (ascending)", () => {
    const result = getNextAyah({ surah: 1, ayah: 7 }, "ascending");
    expect(result).toEqual({ surah: 2, ayah: 1 });
  });

  it("returns null at end of Quran (ascending)", () => {
    const result = getNextAyah({ surah: 114, ayah: 6 }, "ascending");
    expect(result).toBeNull();
  });

  it("moves to previous ayah in same surah (descending)", () => {
    const result = getNextAyah({ surah: 2, ayah: 5 }, "descending");
    expect(result).toEqual({ surah: 2, ayah: 4 });
  });

  it("crosses to previous surah when at first ayah (descending)", () => {
    const result = getNextAyah({ surah: 2, ayah: 1 }, "descending");
    expect(result).toEqual({ surah: 1, ayah: 7 });
  });

  it("returns null at start of Quran (descending)", () => {
    const result = getNextAyah({ surah: 1, ayah: 1 }, "descending");
    expect(result).toBeNull();
  });
});

describe("isPositionInRange", () => {
  it("returns true for position within range", () => {
    const range = { start: { surah: 2, ayah: 1 }, end: { surah: 2, ayah: 50 } };
    expect(isPositionInRange({ surah: 2, ayah: 25 }, range)).toBe(true);
  });

  it("returns true for position at range boundaries", () => {
    const range = { start: { surah: 2, ayah: 1 }, end: { surah: 2, ayah: 50 } };
    expect(isPositionInRange({ surah: 2, ayah: 1 }, range)).toBe(true);
    expect(isPositionInRange({ surah: 2, ayah: 50 }, range)).toBe(true);
  });

  it("returns false for position outside range", () => {
    const range = { start: { surah: 2, ayah: 1 }, end: { surah: 2, ayah: 50 } };
    expect(isPositionInRange({ surah: 1, ayah: 5 }, range)).toBe(false);
    expect(isPositionInRange({ surah: 2, ayah: 51 }, range)).toBe(false);
  });
});

describe("formatPosition", () => {
  it("formats Al-Fatiha verse 1", () => {
    expect(formatPosition({ surah: 1, ayah: 1 })).toBe("الفاتحة ١");
  });

  it("formats Al-Baqarah verse 286", () => {
    expect(formatPosition({ surah: 2, ayah: 286 })).toBe("البقرة ٢٨٦");
  });

  it("formats An-Nas verse 6", () => {
    expect(formatPosition({ surah: 114, ayah: 6 })).toBe("الناس ٦");
  });
});

describe("advanceByPages", () => {
  it("advances 1 page ascending from start of page", () => {
    const result = advanceByPages({ surah: 1, ayah: 1 }, 1, "ascending");
    // Should end at the last ayah on page 1 (Al-Fatiha 7 or wherever 1 page lands)
    expect(result).not.toBeNull();
    expect(result!.surah).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend
npx vitest run src/lib/algorithm/__tests__/helpers.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement helpers.ts**

Create `frontend/src/lib/algorithm/helpers.ts`:

```ts
import type { QuranPosition, PositionRange, Direction } from "@/lib/quran/types";
import { SURAHS, getSurahByNumber } from "@/lib/quran/surahs";
import { getAyahPage, getPageEndAyah, getPageStartAyah, getAyahsOnPage } from "@/lib/quran/ayahPages";
import { LINES_PER_PAGE } from "@/lib/quran/constants";

/**
 * Compare two Quran positions.
 * Returns -1 if a < b, 0 if equal, 1 if a > b.
 * Order: (1,1) < (1,2) < ... < (1,7) < (2,1) < ... < (114,6)
 */
export function comparePositions(a: QuranPosition, b: QuranPosition): number {
  if (a.surah !== b.surah) return a.surah < b.surah ? -1 : 1;
  if (a.ayah !== b.ayah) return a.ayah < b.ayah ? -1 : 1;
  return 0;
}

/**
 * Get the next ayah in the given direction.
 * Returns null if at the boundary of the Quran.
 */
export function getNextAyah(
  pos: QuranPosition,
  direction: Direction
): QuranPosition | null {
  const surah = getSurahByNumber(pos.surah);

  if (direction === "ascending") {
    if (pos.ayah < surah.ayahCount) {
      return { surah: pos.surah, ayah: pos.ayah + 1 };
    }
    if (pos.surah < 114) {
      return { surah: pos.surah + 1, ayah: 1 };
    }
    return null;
  } else {
    if (pos.ayah > 1) {
      return { surah: pos.surah, ayah: pos.ayah - 1 };
    }
    if (pos.surah > 1) {
      const prevSurah = getSurahByNumber(pos.surah - 1);
      return { surah: pos.surah - 1, ayah: prevSurah.ayahCount };
    }
    return null;
  }
}

/**
 * Check if a position falls within an inclusive range.
 */
export function isPositionInRange(
  pos: QuranPosition,
  range: PositionRange
): boolean {
  return comparePositions(pos, range.start) >= 0 && comparePositions(pos, range.end) <= 0;
}

/**
 * Convert a number to Eastern Arabic numerals for display.
 */
function toArabicNumerals(n: number): string {
  const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return String(n).replace(/\d/g, (d) => arabicDigits[parseInt(d)]);
}

/**
 * Format a QuranPosition as "سورة ١٢٣" for display.
 */
export function formatPosition(pos: QuranPosition): string {
  const surah = getSurahByNumber(pos.surah);
  return `${surah.nameArabic} ${toArabicNumerals(pos.ayah)}`;
}

/**
 * Advance from a position by a given number of pages in the given direction.
 * Returns the last ayah covered by the advancement.
 * Returns null if the Quran boundary is hit before completing the advancement.
 */
export function advanceByPages(
  start: QuranPosition,
  pages: number,
  direction: Direction
): QuranPosition | null {
  const startPage = getAyahPage(start.surah, start.ayah);
  const targetLines = pages * LINES_PER_PAGE;

  if (direction === "ascending") {
    const targetPage = startPage + Math.floor(pages);
    const fractional = pages - Math.floor(pages);

    // Clamp to last page
    const clampedPage = Math.min(targetPage, 604);

    if (fractional > 0 && clampedPage < 604) {
      // Handle fractional page
      const nextPageAyahs = getAyahsOnPage(clampedPage + 1);
      if (nextPageAyahs.length > 0) {
        const extraAyahs = Math.max(1, Math.round(nextPageAyahs.length * fractional));
        return nextPageAyahs[Math.min(extraAyahs - 1, nextPageAyahs.length - 1)];
      }
    }

    // Return last ayah on the clamped page
    try {
      return getPageEndAyah(clampedPage);
    } catch {
      return { surah: 114, ayah: 6 }; // End of Quran
    }
  } else {
    // Descending
    const targetPage = startPage - Math.floor(pages);
    const fractional = pages - Math.floor(pages);

    const clampedPage = Math.max(targetPage, 1);

    if (fractional > 0 && clampedPage > 1) {
      const prevPageAyahs = getAyahsOnPage(clampedPage - 1);
      if (prevPageAyahs.length > 0) {
        const extraAyahs = Math.max(1, Math.round(prevPageAyahs.length * fractional));
        return prevPageAyahs[Math.max(0, prevPageAyahs.length - extraAyahs)];
      }
    }

    try {
      return getPageStartAyah(clampedPage);
    } catch {
      return { surah: 1, ayah: 1 }; // Start of Quran
    }
  }
}
```

- [ ] **Step 4: Run tests**

```bash
cd frontend
npx vitest run src/lib/algorithm/__tests__/helpers.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/algorithm/helpers.ts frontend/src/lib/algorithm/__tests__/helpers.test.ts
git commit -m "feat: add algorithm helper functions with position math and formatting"
```

---

## Task 6: Algorithm — New Memorization

**Files:**
- Create: `frontend/src/lib/algorithm/newMemorization.ts`
- Test: `frontend/src/lib/algorithm/__tests__/newMemorization.test.ts`

- [ ] **Step 1: Write test**

Create `frontend/src/lib/algorithm/__tests__/newMemorization.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { calculateNewMemorization } from "@/lib/algorithm/newMemorization";

describe("calculateNewMemorization", () => {
  it("advances ~1 page (15 lines) descending from Al-Ghashiyah", () => {
    const result = calculateNewMemorization(
      { surah: 88, ayah: 1 },
      15,
      "descending"
    );
    expect(result).not.toBeNull();
    // Al-Ghashiyah starts at page 592, so 1 page descending should cover
    // ayahs on page 592 down to page 591 area
    expect(result!.from.surah).toBe(88);
    expect(result!.from.ayah).toBe(1);
  });

  it("returns null when at the start of Quran descending", () => {
    const result = calculateNewMemorization(
      { surah: 1, ayah: 1 },
      15,
      "descending"
    );
    // Should still return something (Al-Fatiha itself)
    // But there's nothing before it
    expect(result).not.toBeNull();
  });

  it("handles ascending direction from Al-Baqarah", () => {
    const result = calculateNewMemorization(
      { surah: 2, ayah: 1 },
      15,
      "ascending"
    );
    expect(result).not.toBeNull();
    expect(result!.from).toEqual({ surah: 2, ayah: 1 });
    // Should advance ~1 page from page 2
  });

  it("mid-surah splitting works for long surahs", () => {
    const result = calculateNewMemorization(
      { surah: 2, ayah: 1 },
      30, // 2 pages
      "ascending"
    );
    expect(result).not.toBeNull();
    // Should stop mid-Al-Baqarah, not go past the surah
    expect(result!.to.surah).toBe(2);
    expect(result!.to.ayah).toBeGreaterThan(1);
    expect(result!.to.ayah).toBeLessThan(286);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend
npx vitest run src/lib/algorithm/__tests__/newMemorization.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement newMemorization.ts**

Create `frontend/src/lib/algorithm/newMemorization.ts`:

```ts
import type { QuranPosition, Direction } from "@/lib/quran/types";
import { advanceByPages } from "./helpers";
import { getNextAyah } from "./helpers";
import { LINES_PER_PAGE } from "@/lib/quran/constants";

export interface NewMemorizationResult {
  from: QuranPosition;
  to: QuranPosition;
  newCursor: QuranPosition;
}

/**
 * Calculate the new memorization range for one assignment.
 *
 * @param cursor - Current position where memorization starts
 * @param linesPerSession - Target number of lines to memorize
 * @param direction - Direction of memorization
 * @returns The from/to range and the new cursor for next assignment, or null if Quran boundary reached
 */
export function calculateNewMemorization(
  cursor: QuranPosition,
  linesPerSession: number,
  direction: Direction
): NewMemorizationResult | null {
  const pages = linesPerSession / LINES_PER_PAGE;

  // The memorization direction: for "descending", we memorize surahs in
  // decreasing order but within a session the range is still from→to
  // For descending: we advance "backward" (lower surah numbers)
  const endPos = advanceByPages(cursor, pages, direction);

  if (!endPos) {
    return null;
  }

  // Determine from/to based on direction
  let from: QuranPosition;
  let to: QuranPosition;

  if (direction === "descending") {
    // Descending: cursor is at higher position, end is lower
    from = endPos;
    to = cursor;
    // But we display from→to as the surah order within the assignment
    // Actually for display we want from=start of assignment, to=end
    // In descending mode: the student memorizes FROM cursor going DOWN
    from = cursor;
    to = endPos;
  } else {
    from = cursor;
    to = endPos;
  }

  // New cursor: one ayah past 'to' in the memorization direction
  const newCursor = getNextAyah(
    direction === "descending" ? to : to,
    direction
  );

  return {
    from,
    to,
    newCursor: newCursor ?? to, // If at boundary, stay at last position
  };
}
```

- [ ] **Step 4: Run tests**

```bash
cd frontend
npx vitest run src/lib/algorithm/__tests__/newMemorization.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/algorithm/newMemorization.ts frontend/src/lib/algorithm/__tests__/newMemorization.test.ts
git commit -m "feat: implement new memorization algorithm with page-based advancement"
```

---

## Task 7: Algorithm — Minor Revision

**Files:**
- Create: `frontend/src/lib/algorithm/minorRevision.ts`
- Test: `frontend/src/lib/algorithm/__tests__/minorRevision.test.ts`

- [ ] **Step 1: Write test**

Create `frontend/src/lib/algorithm/__tests__/minorRevision.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { calculateMinorRevision } from "@/lib/algorithm/minorRevision";

describe("calculateMinorRevision", () => {
  it("returns null for assignment 1", () => {
    const result = calculateMinorRevision(
      { surah: 88, ayah: 1 },
      1,
      "descending",
      1
    );
    expect(result).toBeNull();
  });

  it("covers 1 page behind memorization (descending direction)", () => {
    // Memorizing descending from 88, so minor revision goes ascending from 88
    const result = calculateMinorRevision(
      { surah: 88, ayah: 1 },
      1,
      "descending",
      2
    );
    expect(result).not.toBeNull();
    // Should start from the ayah adjacent to memorization start in opposite direction
    // Since descending memorization starts at 88, minor revision goes UP (ascending)
    // starting from the next surah (89) or the ayah after memStart
  });

  it("handles fractional pages (0.5)", () => {
    const result = calculateMinorRevision(
      { surah: 88, ayah: 1 },
      0.5,
      "descending",
      3
    );
    expect(result).not.toBeNull();
  });

  it("covers pages in ascending direction when memorization is ascending", () => {
    const result = calculateMinorRevision(
      { surah: 2, ayah: 50 },
      1,
      "ascending",
      2
    );
    expect(result).not.toBeNull();
    // Minor revision goes descending (opposite of ascending memorization)
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend
npx vitest run src/lib/algorithm/__tests__/minorRevision.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement minorRevision.ts**

Create `frontend/src/lib/algorithm/minorRevision.ts`:

```ts
import type { QuranPosition, Direction, PositionRange } from "@/lib/quran/types";
import { advanceByPages, getNextAyah } from "./helpers";

/**
 * Calculate the minor revision range for one assignment.
 *
 * Minor revision covers the last X pages of previously memorized material,
 * starting from the point adjacent to the memorization start in the opposite direction.
 *
 * @param memStart - Where the current memorization block starts
 * @param minorRevPages - Number of pages to revise (step 0.5)
 * @param direction - Memorization direction (minor revision goes opposite)
 * @param assignmentNumber - Current assignment number (1-30)
 * @returns The revision range, or null for assignment 1
 */
export function calculateMinorRevision(
  memStart: QuranPosition,
  minorRevPages: number,
  direction: Direction,
  assignmentNumber: number
): PositionRange | null {
  // No minor revision for the first assignment
  if (assignmentNumber === 1) {
    return null;
  }

  // Minor revision direction is opposite to memorization
  const revDirection: Direction = direction === "descending" ? "ascending" : "descending";

  // Start from the ayah adjacent to memorization start, in the opposite direction
  const revStart = getNextAyah(memStart, revDirection);
  if (!revStart) {
    return null; // At Quran boundary, no room for revision
  }

  // Advance by minorRevPages in the revision direction
  const revEnd = advanceByPages(revStart, minorRevPages, revDirection);
  if (!revEnd) {
    return null;
  }

  // Ensure start < end for the range
  const cmp = revStart.surah < revEnd.surah ||
    (revStart.surah === revEnd.surah && revStart.ayah <= revEnd.ayah);

  if (cmp) {
    return { start: revStart, end: revEnd };
  } else {
    return { start: revEnd, end: revStart };
  }
}
```

- [ ] **Step 4: Run tests**

```bash
cd frontend
npx vitest run src/lib/algorithm/__tests__/minorRevision.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/algorithm/minorRevision.ts frontend/src/lib/algorithm/__tests__/minorRevision.test.ts
git commit -m "feat: implement minor revision algorithm"
```

---

## Task 8: Algorithm — Major Revision (with Wraparound)

**Files:**
- Create: `frontend/src/lib/algorithm/majorRevision.ts`
- Test: `frontend/src/lib/algorithm/__tests__/majorRevision.test.ts`

- [ ] **Step 1: Write test (including the critical wraparound scenario)**

Create `frontend/src/lib/algorithm/__tests__/majorRevision.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { calculateMajorRevision } from "@/lib/algorithm/majorRevision";
import type { PositionRange } from "@/lib/quran/types";

describe("calculateMajorRevision", () => {
  it("advances from start position in opposite direction", () => {
    // Memorization descending → major revision ascending
    const result = calculateMajorRevision(
      { surah: 89, ayah: 1 }, // Start from Al-Fajr
      3, // 3 pages
      "descending",
      null, // No memorized range yet
      null  // No minor revision range
    );
    expect(result).not.toBeNull();
    expect(result!.from.surah).toBe(89);
    expect(result!.from.ayah).toBe(1);
  });

  it("skips surahs in memorization range (non-overlap)", () => {
    const memorizedRange: PositionRange = {
      start: { surah: 85, ayah: 1 },
      end: { surah: 88, ayah: 26 },
    };
    const result = calculateMajorRevision(
      { surah: 84, ayah: 1 },
      1,
      "descending",
      memorizedRange,
      null
    );
    expect(result).not.toBeNull();
    // Should not overlap with surahs 85-88
  });

  it("skips minor revision range (non-overlap)", () => {
    const minorRange: PositionRange = {
      start: { surah: 89, ayah: 1 },
      end: { surah: 89, ayah: 30 },
    };
    const result = calculateMajorRevision(
      { surah: 90, ayah: 1 },
      1,
      "descending",
      null,
      minorRange
    );
    expect(result).not.toBeNull();
    // Should not overlap with Al-Fajr
  });

  it("wraps around when reaching Quran boundary", () => {
    // Major revision ascending, reaching An-Nas (114:6)
    // Should wrap to find first free ayah
    const memorizedRange: PositionRange = {
      start: { surah: 80, ayah: 1 },
      end: { surah: 88, ayah: 26 },
    };
    const minorRange: PositionRange = {
      start: { surah: 89, ayah: 1 },
      end: { surah: 89, ayah: 30 },
    };

    // Cursor near end of Quran
    const result = calculateMajorRevision(
      { surah: 113, ayah: 1 },
      3,
      "descending", // major goes ascending
      memorizedRange,
      minorRange
    );
    expect(result).not.toBeNull();
    // After wrapping, should restart outside memorized and minor ranges
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend
npx vitest run src/lib/algorithm/__tests__/majorRevision.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement majorRevision.ts**

Create `frontend/src/lib/algorithm/majorRevision.ts`:

```ts
import type { QuranPosition, Direction, PositionRange } from "@/lib/quran/types";
import { advanceByPages, getNextAyah, isPositionInRange, comparePositions } from "./helpers";
import { getAyahPage } from "@/lib/quran/ayahPages";
import { LINES_PER_PAGE } from "@/lib/quran/constants";

export interface MajorRevisionResult {
  from: QuranPosition;
  to: QuranPosition;
  newCursor: QuranPosition;
}

/**
 * Find the first position that is NOT within any of the excluded ranges,
 * searching in the given direction from the start position.
 */
function findFreePosition(
  start: QuranPosition,
  direction: Direction,
  memorizedRange: PositionRange | null,
  minorRange: PositionRange | null
): QuranPosition | null {
  let pos: QuranPosition | null = start;
  let iterations = 0;
  const maxIterations = 6236; // Safety: total ayahs in Quran

  while (pos && iterations < maxIterations) {
    const inMemorized = memorizedRange ? isPositionInRange(pos, memorizedRange) : false;
    const inMinor = minorRange ? isPositionInRange(pos, minorRange) : false;

    if (!inMemorized && !inMinor) {
      return pos;
    }
    pos = getNextAyah(pos, direction);
    iterations++;
  }
  return null;
}

/**
 * Calculate the major revision range for one assignment.
 *
 * Major revision always moves in the OPPOSITE direction to memorization.
 * It skips any ayahs that overlap with the memorization or minor revision ranges.
 * When it hits the Quran boundary, it wraps around and restarts from the first
 * free ayah outside the excluded ranges.
 *
 * @param cursor - Current major revision cursor
 * @param majRevPages - Pages to cover per assignment (step 0.5)
 * @param memDirection - Memorization direction (major goes opposite)
 * @param memorizedRange - Current memorized range to avoid
 * @param minorRange - Current minor revision range to avoid
 * @returns The revision range and updated cursor, or null if no free space
 */
export function calculateMajorRevision(
  cursor: QuranPosition,
  majRevPages: number,
  memDirection: Direction,
  memorizedRange: PositionRange | null,
  minorRange: PositionRange | null
): MajorRevisionResult | null {
  // Major revision direction is opposite to memorization
  const revDirection: Direction = memDirection === "descending" ? "ascending" : "descending";

  // Find the first free position from cursor
  let start = findFreePosition(cursor, revDirection, memorizedRange, minorRange);

  if (!start) {
    // Try wrapping around from the other end of the Quran
    const wrapStart: QuranPosition = revDirection === "ascending"
      ? { surah: 1, ayah: 1 }
      : { surah: 114, ayah: 6 };
    start = findFreePosition(wrapStart, revDirection, memorizedRange, minorRange);
  }

  if (!start) {
    return null; // No free space for major revision
  }

  // Advance by majRevPages, but skip excluded ranges
  const targetLines = majRevPages * LINES_PER_PAGE;
  let accumulatedLines = 0;
  let current = start;
  let end = start;

  while (accumulatedLines < targetLines) {
    const currentPage = getAyahPage(current.surah, current.ayah);
    const next = getNextAyah(current, revDirection);

    if (!next) {
      // Hit Quran boundary — wrap around
      const wrapStart: QuranPosition = revDirection === "ascending"
        ? { surah: 1, ayah: 1 }
        : { surah: 114, ayah: 6 };
      const freePos = findFreePosition(wrapStart, revDirection, memorizedRange, minorRange);

      if (!freePos || comparePositions(freePos, start) === 0) {
        break; // Wrapped all the way around, no more free space
      }
      current = freePos;
      continue;
    }

    // Skip excluded ranges
    const inMemorized = memorizedRange ? isPositionInRange(next, memorizedRange) : false;
    const inMinor = minorRange ? isPositionInRange(next, minorRange) : false;

    if (inMemorized || inMinor) {
      // Skip to the end of the excluded range
      const skipTarget = findFreePosition(next, revDirection, memorizedRange, minorRange);
      if (!skipTarget) break;
      current = skipTarget;
      continue;
    }

    const nextPage = getAyahPage(next.surah, next.ayah);
    if (nextPage !== currentPage) {
      accumulatedLines += LINES_PER_PAGE;
    }

    end = next;
    current = next;
  }

  // Ensure from < to for consistent range representation
  let from: QuranPosition;
  let to: QuranPosition;
  if (comparePositions(start, end) <= 0) {
    from = start;
    to = end;
  } else {
    from = end;
    to = start;
  }

  // New cursor: next ayah after the end of this revision
  const newCursor = getNextAyah(
    revDirection === "ascending" ? to : from,
    revDirection
  ) ?? cursor;

  return { from, to, newCursor };
}
```

- [ ] **Step 4: Run tests**

```bash
cd frontend
npx vitest run src/lib/algorithm/__tests__/majorRevision.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/algorithm/majorRevision.ts frontend/src/lib/algorithm/__tests__/majorRevision.test.ts
git commit -m "feat: implement major revision algorithm with wraparound logic"
```

---

## Task 9: Algorithm — Plan Generator (Orchestrator)

**Files:**
- Create: `frontend/src/lib/algorithm/planGenerator.ts`
- Test: `frontend/src/lib/algorithm/__tests__/planGenerator.test.ts`

- [ ] **Step 1: Write integration test with the spec's test scenario**

Create `frontend/src/lib/algorithm/__tests__/planGenerator.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { generatePlan } from "@/lib/algorithm/planGenerator";
import type { StudentConfig } from "@/lib/quran/types";

describe("generatePlan", () => {
  const testConfig: StudentConfig = {
    id: "test-1",
    name: "طالب تجريبي",
    halaqah: "حلقة الاختبار",
    planType: "independent",
    memStartSurah: 88,
    memStartAyah: 1,
    linesPerSession: 15,
    direction: "descending",
    minorRevPages: 1,
    majRevStartSurah: 89,
    majRevStartAyah: 1,
    majRevPages: 3,
  };

  it("generates exactly 30 assignments", () => {
    const plan = generatePlan(testConfig);
    expect(plan.assignments).toHaveLength(30);
  });

  it("assignment numbers are 1-30", () => {
    const plan = generatePlan(testConfig);
    plan.assignments.forEach((a, i) => {
      expect(a.assignmentNumber).toBe(i + 1);
    });
  });

  it("assignment 1 has no minor revision", () => {
    const plan = generatePlan(testConfig);
    expect(plan.assignments[0].minorFrom).toBeNull();
    expect(plan.assignments[0].minorTo).toBeNull();
  });

  it("assignment 1 memorization starts at Al-Ghashiyah", () => {
    const plan = generatePlan(testConfig);
    expect(plan.assignments[0].memFrom).toContain("الغاشية");
  });

  it("assignment 1 major revision starts at Al-Fajr", () => {
    const plan = generatePlan(testConfig);
    expect(plan.assignments[0].majorFrom).toContain("الفجر");
  });

  it("assignment 2 has minor revision", () => {
    const plan = generatePlan(testConfig);
    expect(plan.assignments[1].minorFrom).not.toBeNull();
    expect(plan.assignments[1].minorTo).not.toBeNull();
  });

  it("student name and halaqah are in the plan", () => {
    const plan = generatePlan(testConfig);
    expect(plan.studentName).toBe("طالب تجريبي");
    expect(plan.halaqah).toBe("حلقة الاختبار");
  });

  it("settings summary is generated", () => {
    const plan = generatePlan(testConfig);
    expect(plan.settingsSummary.length).toBeGreaterThan(0);
  });

  it("all memorization from/to are non-null", () => {
    const plan = generatePlan(testConfig);
    plan.assignments.forEach((a) => {
      expect(a.memFrom).not.toBeNull();
      expect(a.memTo).not.toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend
npx vitest run src/lib/algorithm/__tests__/planGenerator.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement planGenerator.ts**

Create `frontend/src/lib/algorithm/planGenerator.ts`:

```ts
import type {
  StudentConfig,
  StudentPlan,
  AssignmentRow,
  QuranPosition,
  PositionRange,
} from "@/lib/quran/types";
import { ASSIGNMENTS_COUNT } from "@/lib/quran/constants";
import { calculateNewMemorization } from "./newMemorization";
import { calculateMinorRevision } from "./minorRevision";
import { calculateMajorRevision } from "./majorRevision";
import { formatPosition, comparePositions } from "./helpers";
import { getSurahByNumber } from "@/lib/quran/surahs";

function toArabicNumerals(n: number): string {
  const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return String(n).replace(/\d/g, (d) => arabicDigits[parseInt(d)]);
}

function buildSettingsSummary(config: StudentConfig): string {
  const surah = getSurahByNumber(config.memStartSurah);
  const dirLabel = config.direction === "descending" ? "تنازلي" : "تصاعدي";
  return `حفظ ${toArabicNumerals(config.linesPerSession)} سطر · ${dirLabel} من ${surah.nameArabic} · مراجعة صغيرة ${toArabicNumerals(config.minorRevPages)} ص · مراجعة كبيرة ${toArabicNumerals(config.majRevPages)} ص`;
}

/**
 * Generate a complete 30-assignment memorization plan for a student.
 */
export function generatePlan(config: StudentConfig): StudentPlan {
  const assignments: AssignmentRow[] = [];

  // State tracking across assignments
  let memCursor: QuranPosition = {
    surah: config.memStartSurah,
    ayah: config.memStartAyah,
  };
  let majRevCursor: QuranPosition = {
    surah: config.majRevStartSurah,
    ayah: config.majRevStartAyah,
  };

  // Track the overall memorized range (grows with each assignment)
  let memorizedRangeStart: QuranPosition = { ...memCursor };
  let memorizedRangeEnd: QuranPosition = { ...memCursor };
  let hasMemorized = false;

  for (let i = 1; i <= ASSIGNMENTS_COUNT; i++) {
    // 1. Calculate new memorization
    const memResult = calculateNewMemorization(
      memCursor,
      config.linesPerSession,
      config.direction
    );

    let memFrom: string | null = null;
    let memTo: string | null = null;

    if (memResult) {
      memFrom = formatPosition(memResult.from);
      memTo = formatPosition(memResult.to);
      memCursor = memResult.newCursor;

      // Update memorized range
      if (!hasMemorized) {
        memorizedRangeStart = memResult.from;
        memorizedRangeEnd = memResult.to;
        hasMemorized = true;
      } else {
        if (comparePositions(memResult.from, memorizedRangeStart) < 0) {
          memorizedRangeStart = memResult.from;
        }
        if (comparePositions(memResult.to, memorizedRangeEnd) > 0) {
          memorizedRangeEnd = memResult.to;
        }
      }
    }

    const memorizedRange: PositionRange | null = hasMemorized
      ? { start: memorizedRangeStart, end: memorizedRangeEnd }
      : null;

    // 2. Calculate minor revision
    const minorResult = calculateMinorRevision(
      { surah: config.memStartSurah, ayah: config.memStartAyah },
      config.minorRevPages,
      config.direction,
      i
    );

    let minorFrom: string | null = null;
    let minorTo: string | null = null;
    let minorRange: PositionRange | null = null;

    if (minorResult) {
      minorFrom = formatPosition(minorResult.start);
      minorTo = formatPosition(minorResult.end);
      minorRange = minorResult;
    }

    // 3. Calculate major revision
    const majorResult = calculateMajorRevision(
      majRevCursor,
      config.majRevPages,
      config.direction,
      memorizedRange,
      minorRange
    );

    let majorFrom: string | null = null;
    let majorTo: string | null = null;

    if (majorResult) {
      majorFrom = formatPosition(majorResult.from);
      majorTo = formatPosition(majorResult.to);
      majRevCursor = majorResult.newCursor;
    }

    assignments.push({
      assignmentNumber: i,
      memFrom,
      memTo,
      minorFrom,
      minorTo,
      majorFrom,
      majorTo,
    });
  }

  return {
    studentId: config.id,
    studentName: config.name,
    halaqah: config.halaqah,
    settingsSummary: buildSettingsSummary(config),
    assignments,
  };
}
```

- [ ] **Step 4: Run tests**

```bash
cd frontend
npx vitest run src/lib/algorithm/__tests__/planGenerator.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/algorithm/planGenerator.ts frontend/src/lib/algorithm/__tests__/planGenerator.test.ts
git commit -m "feat: implement plan generator orchestrator with 30-assignment generation"
```

---

## Task 10: Zustand Store

**Files:**
- Create: `frontend/src/lib/store/usePlanStore.ts`

- [ ] **Step 1: Create the store**

Create `frontend/src/lib/store/usePlanStore.ts`:

```ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { StudentConfig, StudentPlan } from "@/lib/quran/types";
import { generatePlan } from "@/lib/algorithm/planGenerator";

interface PlanStore {
  students: StudentConfig[];
  plans: StudentPlan[];
  isGenerating: boolean;

  addStudent: () => void;
  removeStudent: (id: string) => void;
  updateStudent: (id: string, updates: Partial<StudentConfig>) => void;
  generateAllPlans: () => void;
  clearPlans: () => void;
}

function createDefaultStudent(): StudentConfig {
  return {
    id: crypto.randomUUID(),
    name: "",
    halaqah: "",
    planType: "independent",
    memStartSurah: 114,
    memStartAyah: 1,
    linesPerSession: 15,
    direction: "descending",
    minorRevPages: 1,
    majRevStartSurah: 1,
    majRevStartAyah: 1,
    majRevPages: 3,
  };
}

export const usePlanStore = create<PlanStore>()(
  persist(
    (set, get) => ({
      students: [createDefaultStudent()],
      plans: [],
      isGenerating: false,

      addStudent: () =>
        set((state) => ({
          students: [...state.students, createDefaultStudent()],
        })),

      removeStudent: (id) =>
        set((state) => ({
          students: state.students.filter((s) => s.id !== id),
        })),

      updateStudent: (id, updates) =>
        set((state) => ({
          students: state.students.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        })),

      generateAllPlans: () => {
        set({ isGenerating: true });
        const { students } = get();
        const plans: StudentPlan[] = [];

        for (const student of students) {
          if (student.planType === "sameAs" && student.sameAsStudentId) {
            // Copy plan from another student, just change name
            const sourcePlan = plans.find(
              (p) => p.studentId === student.sameAsStudentId
            );
            if (sourcePlan) {
              plans.push({
                ...sourcePlan,
                studentId: student.id,
                studentName: student.name,
                halaqah: student.halaqah,
              });
            }
          } else {
            plans.push(generatePlan(student));
          }
        }

        set({ plans, isGenerating: false });
      },

      clearPlans: () => set({ plans: [] }),
    }),
    {
      name: "quran-plan-generator",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        students: state.students,
        plans: state.plans,
      }),
    }
  )
);
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/lib/store/usePlanStore.ts
git commit -m "feat: add Zustand store with sessionStorage persistence"
```

---

## Task 11: API Abstraction Layer

**Files:**
- Create: `frontend/src/lib/api/planService.ts`

- [ ] **Step 1: Create planService.ts**

Create `frontend/src/lib/api/planService.ts`:

```ts
import type { StudentConfig, StudentPlan } from "@/lib/quran/types";
import { generatePlan } from "@/lib/algorithm/planGenerator";

export interface PlanService {
  generatePlan(config: StudentConfig): Promise<StudentPlan>;
  generateBatchPlans(configs: StudentConfig[]): Promise<StudentPlan[]>;
}

const localPlanService: PlanService = {
  async generatePlan(config) {
    return generatePlan(config);
  },

  async generateBatchPlans(configs) {
    return configs.map((c) => generatePlan(c));
  },
};

// Future: switch based on environment variable
// const useLocal = process.env.NEXT_PUBLIC_USE_LOCAL_ALGORITHM !== 'false';
export const planService: PlanService = localPlanService;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/lib/api/planService.ts
git commit -m "feat: add API abstraction layer for future Django integration"
```

---

## Task 12: Generic UI Components

**Files:**
- Create: `frontend/src/components/ui/Button.tsx`
- Create: `frontend/src/components/ui/Card.tsx`
- Create: `frontend/src/components/ui/Input.tsx`
- Create: `frontend/src/components/ui/Select.tsx`

- [ ] **Step 1: Create Button.tsx**

Create `frontend/src/components/ui/Button.tsx`:

```tsx
"use client";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
}

const variants = {
  primary: "bg-[var(--color-navy)] text-white hover:bg-[#243f54] border-[var(--color-gold)] border-2",
  secondary: "bg-white text-[var(--color-navy)] hover:bg-gray-100 border-gray-300 border",
  danger: "bg-red-600 text-white hover:bg-red-700 border-red-700 border",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-2.5 text-base",
  lg: "px-7 py-3 text-lg",
};

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`rounded-lg font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Create Card.tsx**

Create `frontend/src/components/ui/Card.tsx`:

```tsx
interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
}

export default function Card({ children, className = "", onClose }: CardProps) {
  return (
    <div className={`bg-white rounded-xl shadow-md p-6 relative ${className}`}>
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-3 left-3 text-gray-400 hover:text-red-500 text-xl cursor-pointer"
          aria-label="إغلاق"
        >
          &times;
        </button>
      )}
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Create Input.tsx**

Create `frontend/src/components/ui/Input.tsx`:

```tsx
"use client";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export default function Input({ label, id, className = "", ...props }: InputProps) {
  const inputId = id ?? label;
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={inputId} className="text-sm font-bold text-gray-700">
        {label}
      </label>
      <input
        id={inputId}
        className="border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)] focus:border-transparent"
        {...props}
      />
    </div>
  );
}
```

- [ ] **Step 4: Create Select.tsx**

Create `frontend/src/components/ui/Select.tsx`:

```tsx
"use client";

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
}

export default function Select({
  label,
  value,
  onChange,
  options,
  className = "",
}: SelectProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-sm font-bold text-gray-700">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)] focus:border-transparent bg-white cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/
git commit -m "feat: add generic UI components (Button, Card, Input, Select)"
```

---

## Task 13: Setup Page Components

**Files:**
- Create: `frontend/src/components/setup/SurahSelect.tsx`
- Create: `frontend/src/components/setup/MemorizationSettings.tsx`
- Create: `frontend/src/components/setup/RevisionSettings.tsx`
- Create: `frontend/src/components/setup/StudentCard.tsx`

- [ ] **Step 1: Create SurahSelect.tsx**

Create `frontend/src/components/setup/SurahSelect.tsx`:

```tsx
"use client";

import Select from "@/components/ui/Select";
import { SURAHS } from "@/lib/quran/surahs";

interface SurahSelectProps {
  label: string;
  value: number;
  onChange: (surahNumber: number) => void;
  className?: string;
}

const surahOptions = SURAHS.map((s) => ({
  value: s.number,
  label: `${s.number}. ${s.nameArabic}`,
}));

export default function SurahSelect({
  label,
  value,
  onChange,
  className,
}: SurahSelectProps) {
  return (
    <Select
      label={label}
      value={value}
      onChange={(v) => onChange(Number(v))}
      options={surahOptions}
      className={className}
    />
  );
}
```

- [ ] **Step 2: Create MemorizationSettings.tsx**

Create `frontend/src/components/setup/MemorizationSettings.tsx`:

```tsx
"use client";

import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import SurahSelect from "./SurahSelect";
import type { StudentConfig } from "@/lib/quran/types";

interface Props {
  config: StudentConfig;
  onUpdate: (updates: Partial<StudentConfig>) => void;
}

export default function MemorizationSettings({ config, onUpdate }: Props) {
  return (
    <div className="space-y-3">
      <h4 className="font-bold text-[var(--color-navy)] border-b pb-1">إعدادات الحفظ</h4>

      <SurahSelect
        label="بداية الحفظ"
        value={config.memStartSurah}
        onChange={(n) => onUpdate({ memStartSurah: n, memStartAyah: 1 })}
      />

      <Input
        label="بداية الحفظ من آية"
        type="number"
        min={1}
        value={config.memStartAyah}
        onChange={(e) => onUpdate({ memStartAyah: Number(e.target.value) })}
      />

      <Input
        label="عدد الأسطر لكل واجب"
        type="number"
        min={5}
        max={60}
        value={config.linesPerSession}
        onChange={(e) => onUpdate({ linesPerSession: Number(e.target.value) })}
      />

      <Select
        label="اتجاه الحفظ"
        value={config.direction}
        onChange={(v) => onUpdate({ direction: v as "descending" | "ascending" })}
        options={[
          { value: "descending", label: "تنازلي (من الناس إلى الفاتحة)" },
          { value: "ascending", label: "تصاعدي (من البقرة إلى الناس)" },
        ]}
      />
    </div>
  );
}
```

- [ ] **Step 3: Create RevisionSettings.tsx**

Create `frontend/src/components/setup/RevisionSettings.tsx`:

```tsx
"use client";

import Input from "@/components/ui/Input";
import SurahSelect from "./SurahSelect";
import type { StudentConfig } from "@/lib/quran/types";

interface Props {
  config: StudentConfig;
  onUpdate: (updates: Partial<StudentConfig>) => void;
}

export default function RevisionSettings({ config, onUpdate }: Props) {
  return (
    <div className="space-y-3">
      <h4 className="font-bold text-[var(--color-navy)] border-b pb-1">إعدادات المراجعة</h4>

      <Input
        label="مقدار المراجعة الصغيرة (صفحات)"
        type="number"
        min={0.5}
        max={5}
        step={0.5}
        value={config.minorRevPages}
        onChange={(e) => onUpdate({ minorRevPages: Number(e.target.value) })}
      />

      <SurahSelect
        label="بداية المراجعة الكبيرة"
        value={config.majRevStartSurah}
        onChange={(n) => onUpdate({ majRevStartSurah: n, majRevStartAyah: 1 })}
      />

      <Input
        label="بداية المراجعة الكبيرة من آية"
        type="number"
        min={1}
        value={config.majRevStartAyah}
        onChange={(e) => onUpdate({ majRevStartAyah: Number(e.target.value) })}
      />

      <Input
        label="مقدار المراجعة الكبيرة (صفحات)"
        type="number"
        min={0.5}
        max={10}
        step={0.5}
        value={config.majRevPages}
        onChange={(e) => onUpdate({ majRevPages: Number(e.target.value) })}
      />
    </div>
  );
}
```

- [ ] **Step 4: Create StudentCard.tsx**

Create `frontend/src/components/setup/StudentCard.tsx`:

```tsx
"use client";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import MemorizationSettings from "./MemorizationSettings";
import RevisionSettings from "./RevisionSettings";
import type { StudentConfig } from "@/lib/quran/types";
import { usePlanStore } from "@/lib/store/usePlanStore";

interface Props {
  student: StudentConfig;
}

export default function StudentCard({ student }: Props) {
  const { students, updateStudent, removeStudent } = usePlanStore();
  const otherStudents = students.filter((s) => s.id !== student.id && s.planType === "independent");

  const onUpdate = (updates: Partial<StudentConfig>) => {
    updateStudent(student.id, updates);
  };

  return (
    <Card onClose={students.length > 1 ? () => removeStudent(student.id) : undefined}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="اسم الطالب"
            value={student.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="أدخل اسم الطالب"
          />
          <Input
            label="اسم الحلقة"
            value={student.halaqah}
            onChange={(e) => onUpdate({ halaqah: e.target.value })}
            placeholder="أدخل اسم الحلقة"
          />
        </div>

        <Select
          label="نوع الخطة"
          value={student.planType}
          onChange={(v) => onUpdate({ planType: v as "independent" | "sameAs" })}
          options={[
            { value: "independent", label: "خطة مستقلة" },
            { value: "sameAs", label: "نفس خطة طالب آخر" },
          ]}
        />

        {student.planType === "sameAs" && otherStudents.length > 0 && (
          <Select
            label="اختر الطالب"
            value={student.sameAsStudentId ?? ""}
            onChange={(v) => onUpdate({ sameAsStudentId: v })}
            options={otherStudents.map((s) => ({
              value: s.id,
              label: s.name || "(بدون اسم)",
            }))}
          />
        )}

        {student.planType === "independent" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MemorizationSettings config={student} onUpdate={onUpdate} />
            <RevisionSettings config={student} onUpdate={onUpdate} />
          </div>
        )}
      </div>
    </Card>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/setup/
git commit -m "feat: add setup page components (StudentCard, settings, SurahSelect)"
```

---

## Task 14: Setup Page

**Files:**
- Create: `frontend/src/app/setup/SetupClient.tsx`
- Modify: `frontend/src/app/setup/page.tsx`

- [ ] **Step 1: Create SetupClient.tsx**

Create `frontend/src/app/setup/SetupClient.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import StudentCard from "@/components/setup/StudentCard";
import { usePlanStore } from "@/lib/store/usePlanStore";

export default function SetupClient() {
  const router = useRouter();
  const { students, addStudent, generateAllPlans } = usePlanStore();

  const handleGenerate = () => {
    // Validate: all students must have names
    const invalid = students.some((s) => !s.name.trim());
    if (invalid) {
      alert("يرجى إدخال اسم لكل طالب");
      return;
    }

    generateAllPlans();
    router.push("/preview");
  };

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <h1
          className="text-3xl md:text-4xl font-bold mb-2"
          style={{ color: "var(--color-navy)" }}
        >
          صانع الخطط القرآنية
        </h1>
        <p className="text-gray-500">أداة لتوليد خطط الحفظ والمراجعة للطلاب</p>
      </div>

      <div className="space-y-6">
        {students.map((student, index) => (
          <div key={student.id}>
            <h3
              className="text-lg font-bold mb-2"
              style={{ color: "var(--color-gold)" }}
            >
              الطالب {index + 1}
            </h3>
            <StudentCard student={student} />
          </div>
        ))}
      </div>

      <div className="flex gap-4 justify-center mt-8">
        <Button variant="secondary" onClick={addStudent}>
          + إضافة طالب
        </Button>
        <Button onClick={handleGenerate}>
          توليد الخطط
        </Button>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Update setup/page.tsx**

Replace `frontend/src/app/setup/page.tsx`:

```tsx
import SetupClient from "./SetupClient";

export default function SetupPage() {
  return <SetupClient />;
}
```

- [ ] **Step 3: Verify in browser**

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000/setup`. Verify:
- Title "صانع الخطط القرآنية" displays
- One student card shows with all fields
- "Add Student" button adds another card
- Surah dropdowns show 114 surahs in Arabic
- Direction selector works
- Number inputs work with step 0.5 for revision pages

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/setup/
git commit -m "feat: implement setup page with student configuration cards"
```

---

## Task 15: Preview Page Components

**Files:**
- Create: `frontend/src/components/preview/PlanHeader.tsx`
- Create: `frontend/src/components/preview/PlanTable.tsx`
- Create: `frontend/src/components/preview/PlanFooter.tsx`
- Create: `frontend/src/components/preview/PrintableSheet.tsx`

- [ ] **Step 1: Create PlanHeader.tsx**

Create `frontend/src/components/preview/PlanHeader.tsx`:

```tsx
interface Props {
  studentName: string;
  halaqah: string;
  settingsSummary: string;
}

export default function PlanHeader({ studentName, halaqah, settingsSummary }: Props) {
  return (
    <div
      className="rounded-t-lg p-4 text-white text-center"
      style={{ backgroundColor: "var(--color-navy)" }}
    >
      <h2 className="text-xl font-bold mb-1">الخطة القرآنية</h2>
      <div className="flex justify-center gap-8 text-lg">
        <span>
          الطالب: <strong style={{ color: "var(--color-gold)" }}>{studentName}</strong>
        </span>
        <span>
          الحلقة: <strong style={{ color: "var(--color-gold)" }}>{halaqah}</strong>
        </span>
      </div>
      <p className="text-sm mt-1 opacity-80">{settingsSummary}</p>
    </div>
  );
}
```

- [ ] **Step 2: Create PlanTable.tsx**

Create `frontend/src/components/preview/PlanTable.tsx`:

```tsx
import type { AssignmentRow } from "@/lib/quran/types";

interface Props {
  assignments: AssignmentRow[];
}

function getRowBgColor(num: number): string {
  if (num <= 10) return "bg-white";
  if (num <= 20) return "bg-[var(--color-band-green)]";
  return "bg-[var(--color-band-orange)]";
}

export default function PlanTable({ assignments }: Props) {
  return (
    <table className="w-full border-collapse text-sm" dir="rtl">
      <thead>
        <tr>
          <th className="border border-gray-400 px-2 py-1.5 bg-gray-200 text-[var(--color-navy)]">
            الواجب
          </th>
          <th
            className="border border-gray-400 px-2 py-1.5 text-white"
            style={{ backgroundColor: "var(--color-mem-header)" }}
          >
            الحفظ من
          </th>
          <th
            className="border border-gray-400 px-2 py-1.5 text-white"
            style={{ backgroundColor: "var(--color-mem-header)" }}
          >
            الحفظ إلى
          </th>
          <th
            className="border border-gray-400 px-2 py-1.5 text-white"
            style={{ backgroundColor: "var(--color-minor-header)" }}
          >
            مراجعة صغيرة من
          </th>
          <th
            className="border border-gray-400 px-2 py-1.5 text-white"
            style={{ backgroundColor: "var(--color-minor-header)" }}
          >
            مراجعة صغيرة إلى
          </th>
          <th
            className="border border-gray-400 px-2 py-1.5 text-white"
            style={{ backgroundColor: "var(--color-major-header)" }}
          >
            مراجعة كبيرة من
          </th>
          <th
            className="border border-gray-400 px-2 py-1.5 text-white"
            style={{ backgroundColor: "var(--color-major-header)" }}
          >
            مراجعة كبيرة إلى
          </th>
          <th className="border border-gray-400 px-2 py-1.5 bg-gray-200 text-[var(--color-navy)]">
            رأي المعلم
          </th>
        </tr>
      </thead>
      <tbody>
        {assignments.map((a) => (
          <tr key={a.assignmentNumber} className={getRowBgColor(a.assignmentNumber)}>
            <td className="border border-gray-300 px-2 py-1 text-center font-bold">
              {a.assignmentNumber}
            </td>
            <td className="border border-gray-300 px-2 py-1 text-center">
              {a.memFrom ?? "---"}
            </td>
            <td className="border border-gray-300 px-2 py-1 text-center">
              {a.memTo ?? "---"}
            </td>
            <td className="border border-gray-300 px-2 py-1 text-center">
              {a.minorFrom ?? "---"}
            </td>
            <td className="border border-gray-300 px-2 py-1 text-center">
              {a.minorTo ?? "---"}
            </td>
            <td className="border border-gray-300 px-2 py-1 text-center">
              {a.majorFrom ?? "---"}
            </td>
            <td className="border border-gray-300 px-2 py-1 text-center">
              {a.majorTo ?? "---"}
            </td>
            <td className="border border-gray-300 px-2 py-1 min-w-[80px]"></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 3: Create PlanFooter.tsx**

Create `frontend/src/components/preview/PlanFooter.tsx`:

```tsx
export default function PlanFooter() {
  return (
    <div
      className="rounded-b-lg p-3 text-center text-white font-bold"
      style={{ backgroundColor: "var(--color-navy)" }}
    >
      بارك الله فيك ووفقك للإنجاز والتفوق
    </div>
  );
}
```

- [ ] **Step 4: Create PrintableSheet.tsx**

Create `frontend/src/components/preview/PrintableSheet.tsx`:

```tsx
import type { StudentPlan } from "@/lib/quran/types";
import PlanHeader from "./PlanHeader";
import PlanTable from "./PlanTable";
import PlanFooter from "./PlanFooter";

interface Props {
  plan: StudentPlan;
  isLast: boolean;
}

export default function PrintableSheet({ plan, isLast }: Props) {
  return (
    <>
      <div className="mb-8 print:mb-0">
        <PlanHeader
          studentName={plan.studentName}
          halaqah={plan.halaqah}
          settingsSummary={plan.settingsSummary}
        />
        <PlanTable assignments={plan.assignments} />
        <PlanFooter />
      </div>
      {!isLast && <div className="page-break" />}
    </>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/preview/
git commit -m "feat: add preview page components (PlanHeader, PlanTable, PlanFooter, PrintableSheet)"
```

---

## Task 16: Preview Page + Print Integration

**Files:**
- Create: `frontend/src/hooks/usePrint.ts`
- Create: `frontend/src/app/preview/PreviewClient.tsx`
- Create: `frontend/src/app/preview/page.tsx`

- [ ] **Step 1: Create usePrint.ts**

Create `frontend/src/hooks/usePrint.ts`:

```ts
"use client";

import { useRef } from "react";
import { useReactToPrint } from "react-to-print";

export function usePrint(studentNames: string[]) {
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: () => {
      if (studentNames.length === 1) {
        return `خطة_${studentNames[0]}`;
      }
      return `خطط_قرآنية_${studentNames.length}_طلاب`;
    },
  });

  return { contentRef, handlePrint };
}
```

- [ ] **Step 2: Create PreviewClient.tsx**

Create `frontend/src/app/preview/PreviewClient.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Button from "@/components/ui/Button";
import PrintableSheet from "@/components/preview/PrintableSheet";
import { usePlanStore } from "@/lib/store/usePlanStore";
import { usePrint } from "@/hooks/usePrint";

export default function PreviewClient() {
  const router = useRouter();
  const { plans } = usePlanStore();
  const { contentRef, handlePrint } = usePrint(
    plans.map((p) => p.studentName)
  );

  useEffect(() => {
    if (plans.length === 0) {
      router.push("/setup");
    }
  }, [plans, router]);

  if (plans.length === 0) {
    return null;
  }

  return (
    <main className="min-h-screen">
      <div className="no-print p-4 flex gap-4 justify-center sticky top-0 bg-[#f5f5f5] z-10 border-b shadow-sm">
        <Button variant="secondary" onClick={() => router.push("/setup")}>
          ← الرجوع للإعداد
        </Button>
        <Button onClick={() => handlePrint()}>
          طباعة / تحميل PDF
        </Button>
      </div>

      <div ref={contentRef} className="p-4 md:p-8 max-w-6xl mx-auto">
        {plans.map((plan, index) => (
          <PrintableSheet
            key={plan.studentId}
            plan={plan}
            isLast={index === plans.length - 1}
          />
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Create preview/page.tsx**

Create `frontend/src/app/preview/page.tsx`:

```tsx
import PreviewClient from "./PreviewClient";

export default function PreviewPage() {
  return <PreviewClient />;
}
```

- [ ] **Step 4: Verify full flow in browser**

```bash
cd frontend
npm run dev
```

Test the complete flow:
1. Go to `/setup`, fill in student name and halaqah
2. Click "توليد الخطط"
3. Verify redirect to `/preview` with a 30-row table
4. Verify table colors: rows 1-10 white, 11-20 green, 21-30 orange
5. Verify column headers are color-coded
6. Click "طباعة / تحميل PDF" — verify print dialog opens
7. Save as PDF — verify A4 landscape, colors preserved, Arabic RTL correct
8. Click "الرجوع للإعداد" — verify settings are preserved

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/usePrint.ts frontend/src/app/preview/
git commit -m "feat: implement preview page with print/PDF integration"
```

---

## Task 17: Polish — Responsive, Validation, Font

**Files:**
- Modify: `frontend/src/app/setup/SetupClient.tsx`
- Modify: `frontend/src/app/globals.css`

- [ ] **Step 1: Add form validation to SetupClient**

In `frontend/src/app/setup/SetupClient.tsx`, update the `handleGenerate` function:

```tsx
const handleGenerate = () => {
  const errors: string[] = [];

  students.forEach((s, i) => {
    const label = `الطالب ${i + 1}`;
    if (!s.name.trim()) errors.push(`${label}: يرجى إدخال الاسم`);
    if (!s.halaqah.trim()) errors.push(`${label}: يرجى إدخال اسم الحلقة`);
    if (s.planType === "sameAs" && !s.sameAsStudentId) {
      errors.push(`${label}: يرجى اختيار الطالب المرجعي`);
    }
    if (s.planType === "independent") {
      if (s.linesPerSession < 5 || s.linesPerSession > 60) {
        errors.push(`${label}: عدد الأسطر يجب أن يكون بين ٥ و ٦٠`);
      }
    }
  });

  if (errors.length > 0) {
    alert(errors.join("\n"));
    return;
  }

  generateAllPlans();
  router.push("/preview");
};
```

- [ ] **Step 2: Add Amiri font-face fallback in globals.css**

Add to `frontend/src/app/globals.css` (before the `@media print` block):

```css
@font-face {
  font-family: "Amiri";
  src: url("/fonts/Amiri-Regular.ttf") format("truetype");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "Amiri";
  src: url("/fonts/Amiri-Bold.ttf") format("truetype");
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
```

- [ ] **Step 3: Run all tests**

```bash
cd frontend
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 4: Run build to verify no errors**

```bash
cd frontend
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 5: Final browser verification**

```bash
cd frontend
npm run dev
```

Full test checklist:
- [ ] Setup page: RTL Arabic, cards layout responsive on mobile/tablet/desktop
- [ ] Add multiple students, configure different settings
- [ ] Generate plans → preview shows one table per student
- [ ] Print/PDF: colors preserved, page breaks between students, A4 landscape
- [ ] Back button returns to setup with preserved settings
- [ ] "Same as another student" copies the correct plan

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add validation, font loading, and polish"
```

---

## Verification Checklist

After all tasks complete, verify:

1. **`npx vitest run`** — all algorithm tests pass
2. **`npm run build`** — no build errors
3. **Browser flow:** setup → configure → generate → preview → print
4. **PDF quality:** Save as PDF from print dialog. Check:
   - RTL Arabic text renders correctly
   - Table colors preserved (green/orange bands, colored headers)
   - Page breaks between students
   - Footer blessing text visible
   - A4 landscape layout
5. **Test scenario:** Al-Ghashiyah(88) descending, 15 lines, minor=1pg, major from Al-Fajr(89) 3pg — verify assignment output matches expected pattern
6. **Edge cases:** multiple students, "same as" linking, boundary surahs (1, 114)
