import type { AssignmentRow } from "@/lib/quran/types";

interface Props {
  assignments: AssignmentRow[];
}

function getRowBgColor(num: number): string {
  if (num <= 13) return "bg-white";
  if (num <= 26) return "bg-[var(--color-band-green)]";
  return "bg-[var(--color-band-orange)]";
}

function renderMajorBlocks(blocks: AssignmentRow["majorBlocks"]): string {
  if (!blocks || blocks.length === 0) return "---";
  return blocks
    .map((b) => (b.from === b.to ? b.from : `${b.from} ← ${b.to}`))
    .join(" • ");
}

export default function PlanTable({ assignments }: Props) {
  return (
    <table className="w-full border-collapse text-xs plan-table-print" dir="rtl">
      <thead>
        <tr>
          <th className="border border-gray-400 px-1 py-1 bg-gray-200 text-[var(--color-navy)]">
            الواجب
          </th>
          <th
            className="border border-gray-400 px-2 py-1 text-white"
            style={{ backgroundColor: "var(--color-mem-header)" }}
          >
            الحفظ من
          </th>
          <th
            className="border border-gray-400 px-2 py-1 text-white"
            style={{ backgroundColor: "var(--color-mem-header)" }}
          >
            الحفظ إلى
          </th>
          <th
            className="border border-gray-400 px-2 py-1 text-white"
            style={{ backgroundColor: "var(--color-minor-header)" }}
          >
            مراجعة صغيرة من
          </th>
          <th
            className="border border-gray-400 px-2 py-1 text-white"
            style={{ backgroundColor: "var(--color-minor-header)" }}
          >
            مراجعة صغيرة إلى
          </th>
          <th
            className="border border-gray-400 px-2 py-1 text-white"
            style={{ backgroundColor: "var(--color-major-header)" }}
          >
            المراجعة الكبرى
          </th>
          <th className="border border-gray-400 px-2 py-1 bg-gray-200 text-[var(--color-navy)]">
            رأي المعلم
          </th>
        </tr>
      </thead>
      <tbody>
        {assignments.map((a) => (
          <tr key={a.assignmentNumber} className={getRowBgColor(a.assignmentNumber)}>
            <td className="border border-gray-300 px-1 py-0.5 text-center font-bold">
              {a.assignmentNumber}
            </td>
            <td className="border border-gray-300 px-2 py-0.5 text-center">
              {a.memFrom ?? "---"}
            </td>
            <td className="border border-gray-300 px-2 py-0.5 text-center">
              {a.memTo ?? "---"}
            </td>
            <td className="border border-gray-300 px-2 py-0.5 text-center">
              {a.minorFrom ?? "---"}
            </td>
            <td className="border border-gray-300 px-2 py-0.5 text-center">
              {a.minorTo ?? "---"}
            </td>
            <td className="border border-gray-300 px-2 py-0.5 text-center">
              {renderMajorBlocks(a.majorBlocks)}
            </td>
            <td className="border border-gray-300 px-2 py-0.5 min-w-[60px]"></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
