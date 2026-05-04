"use client";

import Select from "@/components/ui/Select";
import SurahSelect from "./SurahSelect";
import type { StudentConfig } from "@/lib/quran/types";
import { getSurahByNumber } from "@/lib/quran/surahs";

interface Props {
  config: StudentConfig;
  onUpdate: (updates: Partial<StudentConfig>) => void;
}

const MEM_PRESETS: { label: string; value: number }[] = [
  { label: "ثُمن صفحة (٨ أيام)", value: 1 / 8 },
  { label: "سُدس صفحة (٦ أيام)", value: 1 / 6 },
  { label: "خُمس صفحة (٥ أيام)", value: 1 / 5 },
  { label: "رُبع صفحة (٤ أيام)", value: 1 / 4 },
  { label: "ثُلث صفحة (٣ أيام)", value: 1 / 3 },
  { label: "نصف صفحة (يومان)", value: 1 / 2 },
  { label: "صفحة كاملة", value: 1 },
  { label: "صفحة ونصف", value: 1.5 },
  { label: "صفحتان", value: 2 },
  { label: "٣ صفحات", value: 3 },
];

export default function MemorizationSettings({ config, onUpdate }: Props) {
  const surahAyahCount = getSurahByNumber(config.memStartSurah).ayahCount;

  return (
    <div className="space-y-3">
      <h4 className="font-bold text-[var(--color-navy)] border-b pb-1">إعدادات الحفظ</h4>
      <SurahSelect
        label="بداية الحفظ"
        value={config.memStartSurah}
        onChange={(n) => onUpdate({ memStartSurah: n, memStartAyah: 1 })}
      />
      <Select
        label="بداية الحفظ من آية"
        value={String(config.memStartAyah)}
        onChange={(v) => onUpdate({ memStartAyah: Number(v) })}
        options={Array.from({ length: surahAyahCount }, (_, i) => ({
          value: String(i + 1),
          label: String(i + 1),
        }))}
      />
      <Select
        label="المقدار اليومي للحفظ"
        value={String(config.pagesPerSession)}
        onChange={(v) => onUpdate({ pagesPerSession: Number(v) })}
        options={MEM_PRESETS.map((p) => ({
          value: String(p.value),
          label: p.label,
        }))}
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
