"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="glass-strong rounded-2xl p-8 text-center max-w-sm w-full shadow-float space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
          <AlertTriangle size={22} className="text-destructive" />
        </div>
        <div>
          <h2 className="font-semibold tracking-tight mb-1">Something went wrong</h2>
          <p className="text-sm text-muted-foreground">
            {process.env.NODE_ENV === "development"
              ? error.message
              : "An unexpected error occurred. Please try again."}
          </p>
          {error.digest && (
            <p className="text-2xs text-muted-foreground/50 font-mono mt-1">#{error.digest}</p>
          )}
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-1.5 text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
          >
            <RefreshCw size={13} />
            Try again
          </button>
          <a
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors font-mono border border-border rounded-xl px-4 py-2"
          >
            <Home size={13} />
            Home
          </a>
        </div>
      </div>
    </div>
  );
}
