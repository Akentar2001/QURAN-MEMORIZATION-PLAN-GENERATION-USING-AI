import type { StudentPlan } from "@/lib/quran/types";
import PlanHeader from "./PlanHeader";
import PlanTable from "./PlanTable";
import PlanFooter from "./PlanFooter";

interface Props {
  plan: StudentPlan;
  isLast: boolean;
}

export default function PrintableSheet({ plan, isLast }: Props) {
  return (
    <>
      <div className="mb-8 print:mb-0">
        <PlanHeader
          studentName={plan.studentName}
          halaqah={plan.halaqah}
          settingsSummary={plan.settingsSummary}
        />
        <PlanTable assignments={plan.assignments} />
        <PlanFooter />
      </div>
      {!isLast && <div className="page-break" />}
    </>
  );
}
