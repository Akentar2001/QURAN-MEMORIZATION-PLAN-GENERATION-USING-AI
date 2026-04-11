"use client";

import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import StudentCard from "@/components/setup/StudentCard";
import { usePlanStore } from "@/lib/store/usePlanStore";

export default function SetupClient() {
  const router = useRouter();
  const { students, addStudent, generateAllPlans } = usePlanStore();

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
