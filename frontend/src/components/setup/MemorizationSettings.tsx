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
