export function focusColor(score: number): string {
  if (score >= 75) return "#22c55e";
  if (score >= 45) return "#f59e0b";
  return "#ef4444";
}

export function focusLabel(score: number): string {
  if (score >= 75) return "Focused";
  if (score >= 45) return "Distracted";
  return "Unfocused";
}

export function formatDuration(ms: number): string {
  if (!ms) return "—";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export function formatSecs(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export const CHART_COLORS = [
  "#22c55e", "#3b82f6", "#f59e0b", "#a855f7",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1",
];

export const CHART_STYLE = {
  backgroundColor: "transparent",
  fontFamily: "var(--font-dm-mono)",
  fontSize: 11,
};

export const GRID_STYLE = {
  stroke: "rgba(255,255,255,0.06)",
  strokeDasharray: "3 3",
};

export const AXIS_STYLE = {
  fill: "hsl(0 0% 50%)",
  fontSize: 10,
  fontFamily: "var(--font-dm-mono)",
};
