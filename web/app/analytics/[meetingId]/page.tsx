"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getMeetingAnalytics } from "@/lib/api";
import { MeetingAnalytics } from "@/types";
import GroupFocusTimeline from "@/components/analytics/GroupFocusTimeline";
import ParticipantRanking from "@/components/analytics/ParticipantRanking";
import FocusDistributionChart from "@/components/analytics/FocusDistributionChart";
import AlertsBreakdownChart from "@/components/analytics/AlertsBreakdownChart";
import ParticipantDetailCard from "@/components/analytics/ParticipantDetailCard";
import { focusColor, formatDuration, formatDateTime } from "@/components/analytics/chartUtils";
import ThemeToggle from "@/components/ThemeToggle";
import {
  ArrowLeft, Download, Loader2, AlertTriangle,
  Video, Clock, Users, Zap,
} from "lucide-react";

const fadeUp: any = {
  hidden: { opacity: 0, y: 16 },
  show: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: "easeOut" },
  }),
};

function KpiCard({
  icon, label, value, sub, color, delay,
}: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color?: string; delay: number;
}) {
  return (
    <motion.div
      custom={delay} variants={fadeUp} initial="hidden" animate="show"
      className="glass rounded-2xl p-5 flex flex-col gap-2"
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-2xs font-mono uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-3xl font-bold tracking-tight" style={color ? { color } : {}}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground font-mono">{sub}</p>}
    </motion.div>
  );
}

function Section({ title, delay, children }: { title: string; delay: number; children: React.ReactNode }) {
  return (
    <motion.section
      custom={delay} variants={fadeUp} initial="hidden" whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
      className="glass rounded-2xl p-5 sm:p-6"
    >
      <h2 className="text-sm font-semibold tracking-tight mb-5">{title}</h2>
      {children}
    </motion.section>
  );
}

export default function AnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const meetingId = params.meetingId as string;

  const [data, setData] = useState<MeetingAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getMeetingAnalytics(meetingId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [meetingId]);

  function exportReport() {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `focusmeet-${data.roomCode}-${meetingId.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-primary" size={24} />
          <p className="text-sm text-muted-foreground font-mono">Loading report...</p>
        </motion.div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="glass-strong rounded-2xl p-8 text-center max-w-sm mx-4 shadow-float space-y-4">
          <AlertTriangle size={24} className="text-destructive mx-auto" />
          <p className="text-sm text-muted-foreground">{error || "Report not found"}</p>
          <button onClick={() => router.back()}
            className="text-xs text-primary hover:underline font-mono">
            Go back
          </button>
        </motion.div>
      </div>
    );
  }

  const avgColor = focusColor(data.overallAvgScore);

  return (
    <div className="min-h-screen bg-background">

      {/* Sticky header */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="sticky top-0 z-20 glass-strong border-b border-border px-4 sm:px-6 py-3 flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3 min-w-0">
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            <ArrowLeft size={16} />
          </motion.button>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate tracking-tight">{data.roomName}</p>
            <p className="text-2xs font-mono text-muted-foreground truncate">
              {data.roomCode} · {formatDateTime(data.startedAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={exportReport}
            className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground border border-border rounded-xl px-3 py-2 transition-colors hover:bg-secondary"
          >
            <Download size={12} />
            Export
          </motion.button>
          <ThemeToggle />
        </div>
      </motion.header>

      {/* Page body */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-4">

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard
            icon={<Video size={13} />}
            label="Focus Score"
            value={`${data.overallAvgScore}%`}
            sub={data.overallAvgScore >= 75 ? "Highly focused" : data.overallAvgScore >= 45 ? "Partially distracted" : "Unfocused session"}
            color={avgColor}
            delay={0}
          />
          <KpiCard
            icon={<Clock size={13} />}
            label="Duration"
            value={formatDuration(data.durationMs)}
            sub={data.endedAt ? "Completed" : "Ongoing"}
            delay={1}
          />
          <KpiCard
            icon={<Users size={13} />}
            label="Participants"
            value={String(data.participantCount)}
            sub="attended"
            delay={2}
          />
          <KpiCard
            icon={<Zap size={13} />}
            label="Alerts"
            value={String(data.totalAlerts)}
            sub="focus warnings"
            color={data.totalAlerts > 0 ? "#fb923c" : "#34d399"}
            delay={3}
          />
        </div>

        {/* Group timeline */}
        <Section title="Group Focus Over Time" delay={0}>
          <GroupFocusTimeline data={data.groupTimeline} />
        </Section>

        {/* Distribution + Alerts */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Section title="Focus Distribution" delay={0}>
            <FocusDistributionChart participants={data.participants} />
          </Section>
          <Section title="Alert Breakdown" delay={1}>
            <AlertsBreakdownChart participants={data.participants} />
          </Section>
        </div>

        {/* Ranking */}
        <Section title="Attentiveness Ranking" delay={0}>
          <ParticipantRanking participants={data.participants} />
        </Section>

        {/* Per-participant reports */}
        <motion.div
          custom={0} variants={fadeUp} initial="hidden"
          whileInView="show" viewport={{ once: true }}
        >
          <h2 className="text-sm font-semibold tracking-tight mb-3">Participant Reports</h2>
          <div className="space-y-2">
            {data.participants.map((p, i) => (
              <ParticipantDetailCard key={p.userId} participant={p} rank={i + 1} />
            ))}
          </div>
        </motion.div>

        {/* Export footer for mobile */}
        <motion.div
          custom={0} variants={fadeUp} initial="hidden"
          whileInView="show" viewport={{ once: true }}
          className="sm:hidden pt-2"
        >
          <button
            onClick={exportReport}
            className="w-full flex items-center justify-center gap-2 border border-border rounded-xl py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors font-mono"
          >
            <Download size={14} />
            Export JSON Report
          </button>
        </motion.div>

        <div className="h-8" />
      </div>
    </div>
  );
}
