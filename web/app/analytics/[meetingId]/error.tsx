"use client";

import { useEffect } from "react";
import { AlertTriangle, ArrowLeft } from "lucide-react";

export default function AnalyticsError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AnalyticsError]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="glass-strong rounded-2xl p-8 text-center max-w-sm w-full shadow-float space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
          <AlertTriangle size={22} className="text-destructive" />
        </div>
        <div>
          <h2 className="font-semibold mb-1">Report unavailable</h2>
          <p className="text-sm text-muted-foreground">
            This meeting report could not be loaded. It may have expired or the meeting is still in progress.
          </p>
        </div>
        <div className="flex gap-2 justify-center">
          <button
            onClick={reset}
            className="text-sm text-primary hover:underline font-mono"
          >
            Retry
          </button>
          <span className="text-muted-foreground">·</span>
          <a href="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground font-mono">
            <ArrowLeft size={12} /> Home
          </a>
        </div>
      </div>
    </div>
  );
}
