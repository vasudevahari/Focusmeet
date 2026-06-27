"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ParticipantFocusData, FocusSnapshot } from "@/types";
import { X, Eye, AlertTriangle, Users, TrendingUp } from "lucide-react";

interface Props {
  focusData: Map<string, ParticipantFocusData>;
  totalParticipants: number;
  onClose: () => void;
}

function focusColor(s: number) {
  if (s >= 75) return "#34d399";
  if (s >= 45) return "#fbbf24";
  return "#f87171";
}

function focusLabel(s: number) {
  if (s >= 75) return "Focused";
  if (s >= 45) return "Distracted";
  return "Unfocused";
}

function MiniSparkline({ timeline }: { timeline: FocusSnapshot[] }) {
  if (timeline.length < 2) return <div className="h-7 w-20 rounded skeleton" />;
  const W = 80; const H = 28;
  const scores = timeline.map((t) => t.score);
  const min = Math.min(...scores); const max = Math.max(...scores);
  const range = max - min || 1;
  const pts = timeline.map((t, i) => {
    const x = (i / (timeline.length - 1)) * W;
    const y = H - ((t.score - min) / range) * (H - 4) - 2;
    return `${x},${y}`;
  });
  const last = scores[scores.length - 1];
  const c = focusColor(last);
  return (
    <svg width={W} height={H}>
      <polyline points={pts.join(" ")} fill="none" stroke={c} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
    </svg>
  );
}

function GroupTimeline({ data }: { data: FocusSnapshot[] }) {
  if (data.length < 2) return (
    <div className="h-20 flex items-center justify-center">
      <p className="text-xs text-muted-foreground font-mono">Collecting data...</p>
    </div>
  );
  const W = 240; const H = 72;
  const scores = data.map((d) => d.score);
  const last = scores[scores.length - 1];
  const c = focusColor(last);
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - (d.score / 100) * (H - 6) - 3;
    return `${x},${y}`;
  });
  const areaPts = [`0,${H}`, ...pts, `${W},${H}`].join(" ");
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="rounded-xl overflow-hidden">
      <defs>
        <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.25" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="rgba(255,255,255,0.02)" rx="8" />
      {[25, 50, 75].map((y) => (
        <line key={y} x1="0" y1={H - (y / 100) * (H - 6) - 3} x2={W} y2={H - (y / 100) * (H - 6) - 3}
          stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      ))}
      <polygon points={areaPts} fill="url(#dg)" />
      <polyline points={pts.join(" ")} fill="none" stroke={c} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function HostFocusDashboard({ focusData, totalParticipants, onClose }: Props) {
  const [tab, setTab] = useState<"overview" | "detail">("overview");
  const list = useMemo(() => Array.from(focusData.values()), [focusData]);

  const avg = useMemo(() => {
    if (!list.length) return 0;
    return Math.round(list.reduce((s, p) => s + p.currentScore, 0) / list.length);
  }, [list]);

  const focused    = list.filter((p) => p.currentScore >= 70).length;
  const distracted = list.filter((p) => p.currentScore >= 40 && p.currentScore < 70).length;
  const unfocused  = list.filter((p) => p.currentScore < 40).length;
  const warnings   = list.reduce((s, p) => s + p.warningCount, 0);
  const avgColor   = focusColor(avg);

  const aggregateTimeline = useMemo(() => {
    if (!list.length) return [];
    const maxLen = Math.max(...list.map((p) => p.timeline.length));
    const result: FocusSnapshot[] = [];
    for (let i = 0; i < maxLen; i++) {
      const sc = list.map((p) => p.timeline[p.timeline.length - maxLen + i]).filter(Boolean).map((s) => s.score);
      if (sc.length) result.push({ timestamp: Date.now(), score: Math.round(sc.reduce((a, b) => a + b, 0) / sc.length) });
    }
    return result;
  }, [list]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col h-full glass-strong border-l border-border w-80"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Eye size={14} className="text-primary" />
          <h3 className="font-semibold text-sm tracking-tight">Focus Monitor</h3>
        </div>
        <motion.button whileTap={{ scale: 0.88 }} onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
          <X size={14} />
        </motion.button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-2 border-b border-border flex-shrink-0">
        {(["overview", "detail"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`relative flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize ${
              tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === t && (
              <motion.div layoutId="dash-tab" className="absolute inset-0 bg-secondary rounded-lg"
                transition={{ type: "spring", stiffness: 500, damping: 40 }} />
            )}
            <span className="relative">{t === "overview" ? "Overview" : "Per Person"}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <AnimatePresence mode="wait">
          {tab === "overview" ? (
            <motion.div key="overview"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
              className="p-4 space-y-4"
            >
              {/* Big score */}
              <div className="text-center py-3">
                <motion.div key={avg}
                  initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="text-5xl font-bold font-mono mb-1"
                  style={{ color: avgColor }}
                >
                  {avg}%
                </motion.div>
                <p className="text-xs text-muted-foreground font-mono">{focusLabel(avg)} · Group average</p>
              </div>

              {/* Timeline */}
              <div className="bg-secondary/20 rounded-2xl p-3">
                <p className="text-2xs font-mono text-muted-foreground uppercase tracking-widest mb-2">Live Timeline</p>
                <GroupTimeline data={aggregateTimeline} />
                <div className="flex justify-between mt-1">
                  <span className="text-2xs text-muted-foreground font-mono">2 min ago</span>
                  <span className="text-2xs text-muted-foreground font-mono">now</span>
                </div>
              </div>

              {/* Stat grid */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Focused",    val: focused,    color: "#34d399" },
                  { label: "Distracted", val: distracted, color: "#fbbf24" },
                  { label: "Unfocused",  val: unfocused,  color: "#f87171" },
                  { label: "Warnings",   val: warnings,   color: "#fb923c" },
                ].map(({ label, val, color }) => (
                  <motion.div key={label} whileHover={{ scale: 1.02 }}
                    className="bg-secondary/30 rounded-xl p-3 text-center"
                  >
                    <div className="text-2xl font-bold font-mono mb-0.5" style={{ color }}>{val}</div>
                    <div className="text-2xs text-muted-foreground font-mono">{label}</div>
                  </motion.div>
                ))}
              </div>

              {/* Coverage */}
              <div className="bg-secondary/20 rounded-2xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users size={11} />
                    <span className="text-2xs font-mono">Coverage</span>
                  </div>
                  <span className="text-xs font-mono">{list.length}/{totalParticipants}</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <motion.div className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: totalParticipants > 0 ? `${(list.length / totalParticipants) * 100}%` : "0%" }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="detail"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
              className="p-3 space-y-2"
            >
              {list.length === 0 && (
                <p className="text-center text-xs text-muted-foreground font-mono py-8">No data yet</p>
              )}
              <AnimatePresence>
                {[...list].sort((a, b) => a.currentScore - b.currentScore).map((p) => {
                  const c = focusColor(p.currentScore);
                  return (
                    <motion.div key={p.userId}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      className="bg-secondary/20 rounded-xl p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate flex-1">{p.displayName}</span>
                        <span className="text-2xs font-mono flex-shrink-0" style={{ color: c }}>
                          {focusLabel(p.currentScore)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <motion.div className="h-full rounded-full"
                            animate={{ width: `${p.currentScore}%` }}
                            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            style={{ background: c }}
                          />
                        </div>
                        <span className="text-xs font-mono font-bold w-8 text-right" style={{ color: c }}>
                          {Math.round(p.currentScore)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <MiniSparkline timeline={p.timeline} />
                        {p.warningCount > 0 && (
                          <div className="flex items-center gap-1 text-2xs font-mono text-orange-400">
                            <AlertTriangle size={10} />
                            {p.warningCount}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
