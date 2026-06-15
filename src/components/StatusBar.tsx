type StatusBarProps = {
  label: string;
  value: number;
  color: "mint" | "lavender" | "coral";
};

const colors = {
  mint: "bg-[#5DCAA5]",
  lavender: "bg-[#7F77DD]",
  coral: "bg-[#E8734A]"
};

export default function StatusBar({ label, value, color }: StatusBarProps) {
  return (
    <div className="grid grid-cols-[3.5rem_1fr_3rem] items-center gap-2">
      <span className="text-sm font-black text-[#3D2B1F]">{label}</span>
      <div className="h-4 overflow-hidden rounded bg-[#F5E6C8] p-1 shadow-inner">
        <div className={`h-full rounded-sm ${colors[color]}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      <span className="text-right text-sm font-black text-[#3D2B1F]">{value}%</span>
    </div>
  );
}
