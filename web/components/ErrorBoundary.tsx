"use client";

import React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}
interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-[200px] flex items-center justify-center p-6">
          <div className="text-center space-y-3 max-w-xs">
            <div className="w-10 h-10 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertTriangle size={18} className="text-destructive" />
            </div>
            <div>
              <p className="font-semibold text-sm">Something went wrong</p>
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                {this.state.error?.message ?? "Unknown error"}
              </p>
            </div>
            <button
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-mono"
            >
              <RefreshCw size={11} />
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Lightweight functional wrapper for quick use
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
