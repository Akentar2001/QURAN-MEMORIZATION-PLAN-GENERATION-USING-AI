interface Props {
  studentName: string;
  halaqah: string;
  settingsSummary: string;
}

export default function PlanHeader({ studentName, halaqah, settingsSummary }: Props) {
  return (
    <div
      className="px-3 py-4 text-white text-center plan-header-print"
      style={{ backgroundColor: "var(--color-header-bg)" }}
      dir="rtl"
    >
      <div className="font-bold text-lg leading-tight tracking-wide">
        <span style={{ color: "var(--color-gold)" }}>{studentName}</span>
        {halaqah && (
          <span className="font-normal text-white"> &nbsp;|&nbsp; {halaqah}</span>
        )}
      </div>
      <div className="text-sm text-white opacity-90 mt-1 leading-tight">{settingsSummary}</div>
    </div>
  );
}
