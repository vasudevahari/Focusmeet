"use client";

import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { ParticipantReport } from "@/types";
import {
  focusColor, focusLabel, formatSecs, formatDuration, GRID_STYLE, AXIS_STYLE,
} from "./chartUtils";
import { ChevronDown, ChevronUp, AlertTriangle, Clock, Eye } from "lucide-react";

interface Props {
  participant: ParticipantReport;
  rank: number;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg">🥇</span>;
  if (rank === 2) return <span className="text-lg">🥈</span>;
  if (rank === 3) return <span className="text-lg">🥉</span>;
  return (
    <span className="text-xs font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
      #{rank}
    </span>
  );
}

function StatChip({
  icon, label, value, color,
}: { icon: React.ReactNode; label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col gap-0.5 bg-secondary/40 rounded-xl p-2.5">
      <div className="flex items-center gap-1 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-mono uppercase tracking-widest">{label}</span>
      </div>
      <span className="text-sm font-bold font-mono" style={color ? { color } : {}}>
        {value}
      </span>
    </div>
  );
}

function TooltipEl({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const score = payload[0]?.value ?? 0;
  return (
    <div className="glass border border-border rounded-lg px-2 py-1.5 text-xs font-mono">
      <p className="text-muted-foreground">{label}</p>
      <p style={{ color: focusColor(score) }}>{score}%</p>
    </div>
  );
}

export default function ParticipantDetailCard({ participant: p, rank }: Props) {
  const [expanded, setExpanded] = useState(false);
  const color = focusColor(p.avgScore);
  const totalSecs = p.focusedSecs + p.distractedSecs + p.unfocusedSecs;

  return (
    <div className="bg-secondary/20 border border-border rounded-2xl overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors text-left"
      >
        <RankBadge rank={rank} />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{p.displayName}</p>
          <p className="text-[10px] font-mono" style={{ color }}>
            {focusLabel(p.avgScore)} · {p.avgScore}% avg
          </p>
        </div>

        {/* Mini inline bar */}
        <div className="hidden sm:flex items-center gap-2 w-28">
          <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${p.avgScore}%`, background: color }} />
          </div>
        </div>

        {p.alertCount > 0 && (
          <div className="flex items-center gap-1 text-orange-400 text-xs font-mono">
            <AlertTriangle size={11} />
            {p.alertCount}
          </div>
        )}

        {expanded ? (
          <ChevronUp size={14} className="text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border">
          {/* Stat chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
            <StatChip
              icon={<Eye size={10} />}
              label="Avg Focus"
              value={`${p.avgScore}%`}
              color={color}
            />
            <StatChip
              icon={<Clock size={10} />}
              label="Focused"
              value={formatSecs(p.focusedSecs)}
              color="#22c55e"
            />
            <StatChip
              icon={<Clock size={10} />}
              label="Distracted"
              value={formatSecs(p.distractedSecs)}
              color="#f59e0b"
            />
            <StatChip
              icon={<AlertTriangle size={10} />}
              label="Alerts"
              value={String(p.alertCount)}
              color={p.alertCount > 0 ? "#f97316" : undefined}
            />
          </div>

          {/* Time distribution bar */}
          {totalSecs > 0 && (
            <div>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1.5">
                Time Distribution
              </p>
              <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
                {p.focusedSecs > 0 && (
                  <div
                    className="rounded-l-full"
                    style={{ width: `${(p.focusedSecs / totalSecs) * 100}%`, background: "#22c55e" }}
                    title={`Focused: ${formatSecs(p.focusedSecs)}`}
                  />
                )}
                {p.distractedSecs > 0 && (
                  <div
                    style={{ width: `${(p.distractedSecs / totalSecs) * 100}%`, background: "#f59e0b" }}
                    title={`Distracted: ${formatSecs(p.distractedSecs)}`}
                  />
                )}
                {p.unfocusedSecs > 0 && (
                  <div
                    className="rounded-r-full"
                    style={{ width: `${(p.unfocusedSecs / totalSecs) * 100}%`, background: "#ef4444" }}
                    title={`Unfocused: ${formatSecs(p.unfocusedSecs)}`}
                  />
                )}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] font-mono text-green-400">{formatSecs(p.focusedSecs)} focused</span>
                <span className="text-[10px] font-mono text-red-400">{formatSecs(p.unfocusedSecs)} unfocused</span>
              </div>
            </div>
          )}

          {/* Individual timeline */}
          {p.timeline.length > 1 && (
            <div>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1.5">
                Focus Timeline
              </p>
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={p.timeline} margin={{ top: 2, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis dataKey="label" tick={AXIS_STYLE} interval="preserveStartEnd" />
                  <YAxis domain={[0, 100]} tick={AXIS_STYLE} width={24} />
                  <Tooltip content={<TooltipEl />} />
                  <Line
                    type="monotone"
                    dataKey="avgScore"
                    stroke={color}
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 3, fill: color, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Alert breakdown */}
          {p.alertCount > 0 && (
            <div>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1.5">
                Alert Breakdown
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(p.alertsByType).map(([type, count]) => (
                  <div
                    key={type}
                    className="flex items-center gap-1.5 bg-secondary/50 rounded-lg px-2.5 py-1 text-xs font-mono"
                  >
                    <AlertTriangle size={10} className="text-orange-400" />
                    <span className="text-muted-foreground capitalize">
                      {type.replace("_", " ")}
                    </span>
                    <span className="text-orange-400 font-bold">{count as number}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
