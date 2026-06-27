import { focusColor } from "./chartUtils";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  isFocus?: boolean;
}

export default function StatCard({ label, value, sub, color, isFocus }: StatCardProps) {
  const displayColor =
    isFocus && typeof value === "number" ? focusColor(value) : color;

  return (
    <div className="bg-secondary/30 border border-border rounded-2xl p-4 flex flex-col gap-1">
      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
        {label}
      </p>
      <p
        className="text-3xl font-bold font-mono"
        style={displayColor ? { color: displayColor } : {}}
      >
        {value}
      </p>
      {sub && (
        <p className="text-xs text-muted-foreground font-mono">{sub}</p>
      )}
    </div>
  );
}
