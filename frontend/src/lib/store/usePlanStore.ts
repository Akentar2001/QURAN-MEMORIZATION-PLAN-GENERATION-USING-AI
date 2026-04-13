import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { StudentConfig, StudentPlan } from "@/lib/quran/types";
import { generatePlan } from "@/lib/algorithm/planGenerator";

interface PlanStore {
  students: StudentConfig[];
  plans: StudentPlan[];
  isGenerating: boolean;

  addStudent: () => void;
  removeStudent: (id: string) => void;
  updateStudent: (id: string, updates: Partial<StudentConfig>) => void;
  generateAllPlans: () => void;
  clearPlans: () => void;
}

function createDefaultStudent(): StudentConfig {
  return {
    id: crypto.randomUUID(),
    name: "",
    halaqah: "",
    planType: "independent",
    memStartSurah: 114,
    memStartAyah: 1,
    linesPerSession: 15,
    direction: "descending",
    minorRevPages: 1,
    majRevStartSurah: 1,
    majRevStartAyah: 1,
    majRevPages: 3,
  };
}

export const usePlanStore = create<PlanStore>()(
  persist(
    (set, get) => ({
      students: [createDefaultStudent()],
      plans: [],
      isGenerating: false,

      addStudent: () =>
        set((state) => ({
          students: [...state.students, createDefaultStudent()],
        })),

      removeStudent: (id) =>
        set((state) => ({
          students: state.students.filter((s) => s.id !== id),
        })),

      updateStudent: (id, updates) =>
        set((state) => ({
          students: state.students.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        })),

      generateAllPlans: () => {
        set({ isGenerating: true });
        const { students } = get();
        const plans: StudentPlan[] = [];

        for (const student of students) {
          if (student.planType === "sameAs" && student.sameAsStudentId) {
            const sourcePlan = plans.find(
              (p) => p.studentId === student.sameAsStudentId
            );
            if (sourcePlan) {
              plans.push({
                ...sourcePlan,
                studentId: student.id,
                studentName: student.name,
                halaqah: student.halaqah,
              });
            }
          } else {
            plans.push(generatePlan(student));
          }
        }

        set({ plans, isGenerating: false });
      },

      clearPlans: () => set({ plans: [] }),
    }),
    {
      name: "quran-plan-generator",
      version: 2,
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        students: state.students,
        plans: state.plans,
      }),
      migrate: (persisted, version) => {
        const state = persisted as { students?: StudentConfig[]; plans?: StudentPlan[] };
        if (version < 2) {
          return { students: state.students ?? [], plans: [] };
        }
        return state;
      },
    }
  )
);
