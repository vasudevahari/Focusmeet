"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { ParticipantReport } from "@/types";
import { focusColor, GRID_STYLE, AXIS_STYLE } from "./chartUtils";
import { Trophy, AlertTriangle } from "lucide-react";

interface Props {
  participants: ParticipantReport[];
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="glass border border-border rounded-xl px-3 py-2 text-xs font-mono space-y-1">
      <p className="font-semibold text-foreground">{d.displayName}</p>
      <p style={{ color: focusColor(d.avgScore) }}>Avg focus: {d.avgScore}%</p>
      <p className="text-muted-foreground">Alerts: {d.alertCount}</p>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-yellow-400">🥇</span>;
  if (rank === 2) return <span className="text-zinc-300">🥈</span>;
  if (rank === 3) return <span className="text-orange-400">🥉</span>;
  return <span className="text-muted-foreground font-mono text-xs">#{rank}</span>;
}

export default function ParticipantRanking({ participants }: Props) {
  const sorted = [...participants].sort((a, b) => b.avgScore - a.avgScore);

  return (
    <div className="space-y-4">
      {/* Bar chart */}
      <ResponsiveContainer width="100%" height={180}>
        <BarChart
          data={sorted}
          margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
          barSize={28}
        >
          <CartesianGrid {...GRID_STYLE} vertical={false} />
          <XAxis
            dataKey="displayName"
            tick={AXIS_STYLE}
            tickFormatter={(v) => v.split(" ")[0]}
          />
          <YAxis domain={[0, 100]} tick={AXIS_STYLE} width={28} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <Bar dataKey="avgScore" radius={[4, 4, 0, 0]}>
            {sorted.map((p, i) => (
              <Cell key={p.userId} fill={focusColor(p.avgScore)} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Ranked list */}
      <div className="space-y-1.5">
        {sorted.map((p, i) => (
          <div
            key={p.userId}
            className="flex items-center gap-3 px-3 py-2 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
          >
            <div className="w-6 text-center flex-shrink-0">
              <RankBadge rank={i + 1} />
            </div>
            <span className="flex-1 text-sm font-medium truncate">{p.displayName}</span>

            {/* Focus bar */}
            <div className="flex items-center gap-2 w-32">
              <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${p.avgScore}%`, background: focusColor(p.avgScore) }}
                />
              </div>
              <span
                className="text-xs font-mono font-bold w-8 text-right"
                style={{ color: focusColor(p.avgScore) }}
              >
                {p.avgScore}%
              </span>
            </div>

            {p.alertCount > 0 && (
              <div className="flex items-center gap-1 text-orange-400 text-xs font-mono">
                <AlertTriangle size={10} />
                {p.alertCount}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
