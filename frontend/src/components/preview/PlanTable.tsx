import type { AssignmentRow } from "@/lib/quran/types";

interface Props {
  assignments: AssignmentRow[];
}

function getRowBgColor(num: number): string {
  if (num <= 10) return "bg-white";
  if (num <= 20) return "bg-[var(--color-band-green)]";
  return "bg-[var(--color-band-orange)]";
}

export default function PlanTable({ assignments }: Props) {
  return (
    <table className="w-full border-collapse text-sm" dir="rtl">
      <thead>
        <tr>
          <th className="border border-gray-400 px-2 py-1.5 bg-gray-200 text-[var(--color-navy)]">
            الواجب
          </th>
          <th
            className="border border-gray-400 px-2 py-1.5 text-white"
            style={{ backgroundColor: "var(--color-mem-header)" }}
          >
            الحفظ من
          </th>
          <th
            className="border border-gray-400 px-2 py-1.5 text-white"
            style={{ backgroundColor: "var(--color-mem-header)" }}
          >
            الحفظ إلى
          </th>
          <th
            className="border border-gray-400 px-2 py-1.5 text-white"
            style={{ backgroundColor: "var(--color-minor-header)" }}
          >
            مراجعة صغيرة من
          </th>
          <th
            className="border border-gray-400 px-2 py-1.5 text-white"
            style={{ backgroundColor: "var(--color-minor-header)" }}
          >
            مراجعة صغيرة إلى
          </th>
          <th
            className="border border-gray-400 px-2 py-1.5 text-white"
            style={{ backgroundColor: "var(--color-major-header)" }}
          >
            مراجعة كبيرة من
          </th>
          <th
            className="border border-gray-400 px-2 py-1.5 text-white"
            style={{ backgroundColor: "var(--color-major-header)" }}
          >
            مراجعة كبيرة إلى
          </th>
          <th className="border border-gray-400 px-2 py-1.5 bg-gray-200 text-[var(--color-navy)]">
            رأي المعلم
          </th>
        </tr>
      </thead>
      <tbody>
        {assignments.map((a) => (
          <tr key={a.assignmentNumber} className={getRowBgColor(a.assignmentNumber)}>
            <td className="border border-gray-300 px-2 py-1 text-center font-bold">
              {a.assignmentNumber}
            </td>
            <td className="border border-gray-300 px-2 py-1 text-center">
              {a.memFrom ?? "---"}
            </td>
            <td className="border border-gray-300 px-2 py-1 text-center">
              {a.memTo ?? "---"}
            </td>
            <td className="border border-gray-300 px-2 py-1 text-center">
              {a.minorFrom ?? "---"}
            </td>
            <td className="border border-gray-300 px-2 py-1 text-center">
              {a.minorTo ?? "---"}
            </td>
            <td className="border border-gray-300 px-2 py-1 text-center">
              {a.majorFrom ?? "---"}
            </td>
            <td className="border border-gray-300 px-2 py-1 text-center">
              {a.majorTo ?? "---"}
            </td>
            <td className="border border-gray-300 px-2 py-1 min-w-[80px]"></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
