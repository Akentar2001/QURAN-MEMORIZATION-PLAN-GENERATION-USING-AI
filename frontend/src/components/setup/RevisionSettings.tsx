"use client";

import Select from "@/components/ui/Select";
import SurahSelect from "./SurahSelect";
import type { StudentConfig } from "@/lib/quran/types";

interface Props {
  config: StudentConfig;
  onUpdate: (updates: Partial<StudentConfig>) => void;
}

const MINOR_PRESETS: { label: string; value: number }[] = Array.from(
  { length: 39 },
  (_, i) => {
    const val = (i + 2) / 2;
    return { label: `${val} صفحة`, value: val };
  }
);

const MAJOR_PRESETS: { label: string; value: number }[] = [
  { label: "١ صفحة", value: 1 },
  { label: "٢ صفحات", value: 2 },
  { label: "٣ صفحات", value: 3 },
  { label: "٤ صفحات", value: 4 },
  { label: "٥ صفحات", value: 5 },
  { label: "٦ صفحات", value: 6 },
  { label: "٧ صفحات", value: 7 },
  { label: "٨ صفحات", value: 8 },
  { label: "٩ صفحات", value: 9 },
  { label: "١٠ صفحات", value: 10 },
  { label: "١٥ صفحة", value: 15 },
  { label: "٢٠ صفحة (جزء)", value: 20 },
  { label: "٤٠ صفحة (جزءان)", value: 40 },
  { label: "٦٠ صفحة (٣ أجزاء)", value: 60 },
];

export default function RevisionSettings({ config, onUpdate }: Props) {
  return (
    <div className="space-y-3">
      <h4 className="font-bold text-[var(--color-navy)] border-b pb-1">إعدادات المراجعة</h4>
      <Select
        label="مقدار المراجعة الصغرى"
        value={String(config.minorRevPages)}
        onChange={(v) => onUpdate({ minorRevPages: Number(v) })}
        options={MINOR_PRESETS.map((p) => ({
          value: String(p.value),
          label: p.label,
        }))}
      />
      <SurahSelect
        label="بداية المراجعة الكبرى (السورة)"
        value={config.majRevStartSurah}
        onChange={(n) => onUpdate({ majRevStartSurah: n, majRevStartAyah: 1 })}
      />
      <Select
        label="مقدار المراجعة الكبرى"
        value={String(config.majRevPages)}
        onChange={(v) => onUpdate({ majRevPages: Number(v) })}
        options={MAJOR_PRESETS.map((p) => ({
          value: String(p.value),
          label: p.label,
        }))}
      />
    </div>
  );
}
