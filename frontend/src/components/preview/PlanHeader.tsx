interface Props {
  studentName: string;
  halaqah: string;
  settingsSummary: string;
}

export default function PlanHeader({ studentName, halaqah, settingsSummary }: Props) {
  return (
    <div
      className="rounded-t-lg p-4 text-white text-center plan-header-print"
      style={{ backgroundColor: "var(--color-navy)" }}
    >
      <h2 className="text-xl font-bold mb-1">الخطة القرآنية</h2>
      <div className="flex justify-center gap-8 text-lg header-info">
        <span>
          الطالب: <strong style={{ color: "var(--color-gold)" }}>{studentName}</strong>
        </span>
        <span>
          الحلقة: <strong style={{ color: "var(--color-gold)" }}>{halaqah}</strong>
        </span>
      </div>
      <p className="text-sm mt-1 opacity-80 header-settings">{settingsSummary}</p>
    </div>
  );
}
