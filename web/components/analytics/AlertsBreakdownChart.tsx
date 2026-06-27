"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { ParticipantReport } from "@/types";
import { GRID_STYLE, AXIS_STYLE } from "./chartUtils";

interface Props {
  participants: ParticipantReport[];
}

const ALERT_META: Record<string, { label: string; color: string }> = {
  looking_away: { label: "Looking Away", color: "#f59e0b" },
  face_absent:  { label: "Face Absent",  color: "#ef4444" },
  eyes_closed:  { label: "Eyes Closed",  color: "#a855f7" },
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass border border-border rounded-xl px-3 py-2 text-xs font-mono">
      <p className="text-muted-foreground mb-0.5">{label}</p>
      <p className="font-bold" style={{ color: payload[0].fill }}>
        {payload[0].value} alerts
      </p>
    </div>
  );
}

export default function AlertsBreakdownChart({ participants }: Props) {
  // Aggregate alert counts per type across all participants
  const totals: Record<string, number> = {};
  for (const p of participants) {
    for (const [type, count] of Object.entries(p.alertsByType)) {
      totals[type] = (totals[type] || 0) + (count as number);
    }
  }

  const data = Object.entries(ALERT_META).map(([key, meta]) => ({
    type: key,
    label: meta.label,
    count: totals[key] || 0,
    color: meta.color,
  }));

  const totalAlerts = data.reduce((s, d) => s + d.count, 0);

  if (totalAlerts === 0) {
    return (
      <div className="flex items-center justify-center h-28 text-xs text-muted-foreground font-mono">
        No alerts recorded 🎉
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }} barSize={36}>
        <CartesianGrid {...GRID_STYLE} vertical={false} />
        <XAxis dataKey="label" tick={AXIS_STYLE} />
        <YAxis allowDecimals={false} tick={AXIS_STYLE} width={24} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.type} fill={d.color} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
