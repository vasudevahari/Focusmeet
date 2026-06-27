"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, EyeOff, UserX, X } from "lucide-react";

interface Notification {
  id: string;
  userId: string;
  displayName: string;
  message: string;
  eventType: string;
  timestamp: number;
}

interface FocusNotificationProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

const META: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  eyes_closed:  { icon: <EyeOff size={13} />,       label: "Eyes Closed",  color: "#a78bfa" },
  face_absent:  { icon: <UserX size={13} />,         label: "Away",         color: "#f87171" },
  looking_away: { icon: <AlertTriangle size={13} />, label: "Distracted",   color: "#fbbf24" },
};

export default function FocusNotification({ notifications, onDismiss }: FocusNotificationProps) {
  return (
    <div className="fixed top-[60px] right-4 z-50 flex flex-col gap-2 w-72 pointer-events-none">
      <AnimatePresence>
        {notifications.slice(0, 4).map((n) => {
          const meta = META[n.eventType] ?? META.looking_away;
          return (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 48, scale: 0.92 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 48, scale: 0.92 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto glass-strong rounded-2xl overflow-hidden shadow-float"
              style={{ borderLeft: `3px solid ${meta.color}` }}
            >
              <div className="flex items-start gap-2.5 p-3">
                <div
                  className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `${meta.color}18`, color: meta.color }}
                >
                  {meta.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-xs font-semibold truncate">{n.displayName}</span>
                    <span
                      className="text-2xs font-mono px-1.5 py-0.5 rounded-md flex-shrink-0"
                      style={{ background: `${meta.color}15`, color: meta.color }}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <p className="text-2xs text-muted-foreground leading-snug">{n.message}</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => onDismiss(n.id)}
                  className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-md hover:bg-secondary transition-colors text-muted-foreground/60 hover:text-muted-foreground"
                >
                  <X size={11} />
                </motion.button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
