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
