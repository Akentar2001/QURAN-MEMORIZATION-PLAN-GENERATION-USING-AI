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
