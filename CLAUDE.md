# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This repo holds two related implementations of a Quran memorization plan generator:

- **`frontend/`** — the active codebase. A client-side Next.js 16 / React 19 app (TypeScript, Tailwind v4, Zustand). All plan-generation logic lives in the browser; there is no live backend.
- **`plan_generation_service.py`** and **`recitation_session_Service.py`** at the repo root — the legacy Django/SQLAlchemy backend. **Treated as a behavioral spec**: the TS algorithm under [frontend/src/lib/algorithm/](frontend/src/lib/algorithm/) is a port of `plan_generation_service.py`. When fixing algorithm bugs, diff against the Python first.
- **`verses.csv` / `surahs.csv` / `verse_difficulty.csv`** — source data. `verses.csv` and `surahs.csv` are compiled into [frontend/src/lib/quran/verseData.ts](frontend/src/lib/quran/verseData.ts) by [scripts/generate-verse-data.ts](scripts/generate-verse-data.ts). `verseData.ts` is auto-generated — do not edit by hand; rerun the script.
- **`docs/architecture.md`** — aspirational v3.0 spec (Django + PostgreSQL + ML). Does NOT reflect the current implementation (which is client-side Next.js). Don't treat it as authoritative.

`CPCS499-C16-FINAL REPORT.pdf` and `research-context-1.1.md` are background research, not implementation references.

## Commands (run from `frontend/`)

| Task | Command |
|---|---|
| Dev server | `npm run dev` |
| Production build | `npm run build` |
| Lint | `npm run lint` |
| Tests (watch) | `npm test` |
| Tests (one-shot) | `npm run test:run` |
| Single test file | `npx vitest run src/lib/algorithm/__tests__/planGenerator.test.ts` |
| Single test by name | `npx vitest run -t "wrap"` |
| Regenerate verseData.ts | `npm run generate-verse-data` (run after editing `verses.csv` / `surahs.csv`) |

Vitest uses jsdom and resolves `@/` to `frontend/src/`.

## Algorithm architecture

The plan generator produces a 40-row table per student. Each row has three sub-plans, generated in order, in [planGenerator.ts](frontend/src/lib/algorithm/planGenerator.ts):

1. **New memorization** ([newMemorization.ts](frontend/src/lib/algorithm/newMemorization.ts)) — walks forward in `memDirection` from a persistent `memCursor`, consuming `linesPerSession / LINES_PER_PAGE` page-budget worth of verses.
2. **Minor revision** ([minorRevision.ts](frontend/src/lib/algorithm/minorRevision.ts)) — replays whole prior memorization sessions, most-recent first, greedily fitting `minorRevPages`. **Session-based, not walk-based** — this matters because in-surah ayah order is always `1 → last`, even when overall `memDirection === "descending"`, so a verse-walk would wander into unmemorized future material.
3. **Major revision** ([majorRevision.ts](frontend/src/lib/algorithm/majorRevision.ts)) — walks forward in the review direction (opposite of `memDirection`) from a persistent `majRevCursor`, with one hard wall: today's minor start surah, falling back to today's memo start surah. Cursor exhausting at end-of-Quran sets `newCursor = null`, which the next call interprets as "teleport past the wall surah" — that's the wrap-around.

[helpers.ts](frontend/src/lib/algorithm/helpers.ts) provides the position primitives (`comparePositions`, `getNextAyah`, `walkByWeight`, `weightBetween`, `normalizeRange`, formatters). `walkByWeight` enforces a 10% surah-boundary stop rule and a 110% extension snap — both algorithm-critical, both already present in the Python source.

[verseData.ts](frontend/src/lib/quran/verseData.ts) exports `VERSES` (Quran-order array), `BY_REVERSE` (descending-order array), `BY_POSITION` (lookup by `[surah][ayah]`), and `REVERSE_IDX_TO_ARRAY_IDX` — used by `walkByWeight` to iterate in either direction in O(1) per verse.

State (student configs + generated plans) is held in [usePlanStore.ts](frontend/src/lib/store/usePlanStore.ts) (Zustand + localStorage persistence). Plans are regenerated client-side every time `generateAllPlans` is called — there is no server.

## Things that are easy to get wrong

- **`config.direction` is `memDirection`**, not review direction. Review direction is always the opposite. The student's "active surah" for the major-revision wall comes from `memResult.from.surah` (Python's `start_verse_id.surah`), not the lower bound of a normalized range.
- **`PositionRange` is normalized** (`start ≤ end` in Quran order) regardless of mem direction. Use `memResult.from` / `memResult.to` (iteration order) when you need direction-aware endpoints.
- **The frontend is Next.js 16** with breaking changes from your training data — see [frontend/AGENTS.md](frontend/AGENTS.md). Check `node_modules/next/dist/docs/` before writing Next.js-specific code.
