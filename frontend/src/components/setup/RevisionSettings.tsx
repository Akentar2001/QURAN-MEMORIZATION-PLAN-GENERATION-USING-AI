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
