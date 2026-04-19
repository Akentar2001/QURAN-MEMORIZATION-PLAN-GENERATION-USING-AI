"use client";

import Select from "@/components/ui/Select";
import SurahSelect from "./SurahSelect";
import type { StudentConfig } from "@/lib/quran/types";

interface Props {
  config: StudentConfig;
  onUpdate: (updates: Partial<StudentConfig>) => void;
}

const MEM_PRESETS: { label: string; value: number }[] = [
  { label: "٢ سطر", value: 2 },
  { label: "٣ سطر", value: 3 },
  { label: "٤ سطر", value: 4 },
  { label: "٥ سطر", value: 5 },
  { label: "٦ سطر", value: 6 },
  { label: "٧ سطر (نصف صفحة)", value: 7 },
  { label: "صفحة كاملة (١٥ سطر)", value: 15 },
  { label: "صفحة ونصف", value: 22 },
  { label: "صفحتان", value: 30 },
  { label: "٣ صفحات", value: 45 },
];

export default function MemorizationSettings({ config, onUpdate }: Props) {
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
        options={Array.from({ length: 30 }, (_, i) => ({
          value: String(i + 1),
          label: String(i + 1),
        }))}
      />
      <Select
        label="المقدار اليومي للحفظ"
        value={String(config.linesPerSession)}
        onChange={(v) => onUpdate({ linesPerSession: Number(v) })}
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
