"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { TimelineBucket } from "@/types";
import { focusColor, GRID_STYLE, AXIS_STYLE } from "./chartUtils";

interface Props {
  data: TimelineBucket[];
  title?: string;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const score = payload[0]?.value ?? 0;
  return (
    <div className="glass border border-border rounded-xl px-3 py-2 text-xs font-mono">
      <p className="text-muted-foreground mb-1">{label}</p>
      <p className="font-bold" style={{ color: focusColor(score) }}>
        {score}% focus
      </p>
    </div>
  );
}

export default function GroupFocusTimeline({ data, title }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-xs text-muted-foreground font-mono">
        No timeline data
      </div>
    );
  }

  // Color gradient stops based on score
  const lastScore = data[data.length - 1]?.avgScore ?? 80;
  const lineColor = focusColor(lastScore);

  return (
    <div className="w-full">
      {title && (
        <p className="text-xs font-mono text-muted-foreground mb-3 uppercase tracking-widest">
          {title}
        </p>
      )}
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="focusGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={lineColor} stopOpacity={0.25} />
              <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis dataKey="label" tick={AXIS_STYLE} interval="preserveStartEnd" />
          <YAxis domain={[0, 100]} tick={AXIS_STYLE} width={28} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={70} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.4} />
          <ReferenceLine y={40} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.4} />
          <Area
            type="monotone"
            dataKey="avgScore"
            stroke={lineColor}
            strokeWidth={2}
            fill="url(#focusGrad)"
            dot={false}
            activeDot={{ r: 4, fill: lineColor, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-1 justify-end">
        <span className="flex items-center gap-1 text-[10px] font-mono text-green-400">
          <div className="w-3 h-0.5 bg-green-400 opacity-40" style={{ borderTop: "1px dashed #22c55e" }} />
          70% threshold
        </span>
        <span className="flex items-center gap-1 text-[10px] font-mono text-red-400">
          <div className="w-3 h-0.5 opacity-40" style={{ borderTop: "1px dashed #ef4444" }} />
          40% threshold
        </span>
      </div>
    </div>
  );
}
