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

export default function SurahSelect({ label, value, onChange, className }: SurahSelectProps) {
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
