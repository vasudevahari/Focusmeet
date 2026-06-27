import Link from "next/link";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center space-y-4">
        <p className="text-6xl font-bold font-mono text-muted-foreground/30">404</p>
        <div>
          <h2 className="font-semibold tracking-tight mb-1">Page not found</h2>
          <p className="text-sm text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
        >
          <Home size={14} />
          Go home
        </Link>
      </div>
    </div>
  );
}
