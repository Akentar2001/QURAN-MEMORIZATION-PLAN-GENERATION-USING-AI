import type { StudentConfig, StudentPlan } from "@/lib/quran/types";
import { generatePlan } from "@/lib/algorithm/planGenerator";

export interface PlanService {
  generatePlan(config: StudentConfig): Promise<StudentPlan>;
  generateBatchPlans(configs: StudentConfig[]): Promise<StudentPlan[]>;
}

const localPlanService: PlanService = {
  async generatePlan(config) {
    return generatePlan(config);
  },

  async generateBatchPlans(configs) {
    return configs.map((c) => generatePlan(c));
  },
};

export const planService: PlanService = localPlanService;
