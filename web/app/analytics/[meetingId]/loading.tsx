import { Loader2 } from "lucide-react";

export default function AnalyticsLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <div className="glass-strong border-b border-border px-6 py-3 flex items-center gap-3">
        <div className="skeleton w-8 h-8 rounded-xl" />
        <div className="space-y-1.5">
          <div className="skeleton w-32 h-4" />
          <div className="skeleton w-48 h-3" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass rounded-2xl p-5 space-y-2">
              <div className="skeleton w-20 h-3" />
              <div className="skeleton w-16 h-8" />
              <div className="skeleton w-24 h-3" />
            </div>
          ))}
        </div>

        {/* Timeline skeleton */}
        <div className="glass rounded-2xl p-5 space-y-3">
          <div className="skeleton w-40 h-4" />
          <div className="skeleton w-full h-44 rounded-xl" />
        </div>

        {/* Two-col */}
        <div className="grid sm:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="glass rounded-2xl p-5 space-y-3">
              <div className="skeleton w-32 h-4" />
              <div className="skeleton w-full h-36 rounded-xl" />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center py-4 gap-2 text-muted-foreground">
          <Loader2 size={14} className="animate-spin" />
          <span className="text-xs font-mono">Loading report...</span>
        </div>
      </div>
    </div>
  );
}
