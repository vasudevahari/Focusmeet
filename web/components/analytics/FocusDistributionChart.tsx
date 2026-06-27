"use client";

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { ParticipantReport } from "@/types";
import { formatSecs } from "./chartUtils";

interface Props {
  participants: ParticipantReport[];
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass border border-border rounded-xl px-3 py-2 text-xs font-mono">
      <p style={{ color: payload[0].payload.fill }} className="font-semibold">
        {payload[0].name}
      </p>
      <p className="text-muted-foreground">{formatSecs(payload[0].value)}</p>
    </div>
  );
}

const SEGMENTS = [
  { key: "focusedSecs", label: "Focused", color: "#22c55e" },
  { key: "distractedSecs", label: "Distracted", color: "#f59e0b" },
  { key: "unfocusedSecs", label: "Unfocused", color: "#ef4444" },
];

export default function FocusDistributionChart({ participants }: Props) {
  const totals = SEGMENTS.map((seg) => ({
    name: seg.label,
    value: participants.reduce(
      (s, p) => s + (p[seg.key as keyof ParticipantReport] as number),
      0
    ),
    fill: seg.color,
  })).filter((d) => d.value > 0);

  const total = totals.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-xs text-muted-foreground font-mono">
        No data yet
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width={160} height={160}>
        <PieChart>
          <Pie
            data={totals}
            cx="50%"
            cy="50%"
            innerRadius={44}
            outerRadius={68}
            paddingAngle={3}
            dataKey="value"
            strokeWidth={0}
          >
            {totals.map((entry, i) => (
              <Cell key={i} fill={entry.fill} fillOpacity={0.9} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      <div className="flex-1 space-y-2">
        {totals.map((d) => {
          const pct = Math.round((d.value / total) * 100);
          return (
            <div key={d.name}>
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: d.fill }} />
                  <span className="text-xs font-mono text-muted-foreground">{d.name}</span>
                </div>
                <span className="text-xs font-mono font-bold" style={{ color: d.fill }}>
                  {pct}%
                </span>
              </div>
              <div className="h-1 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, background: d.fill }}
                />
              </div>
              <p className="text-[10px] font-mono text-muted-foreground/60 mt-0.5">
                {formatSecs(d.value)} total
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
