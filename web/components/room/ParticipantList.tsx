"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Participant } from "@/types";
import { Mic, MicOff, Video, VideoOff, Crown, UserX, VolumeX, X, Users } from "lucide-react";

interface ParticipantListProps {
  participants: Participant[];
  myUserId: string;
  isHost: boolean;
  onKick: (userId: string) => void;
  onMute: (userId: string) => void;
  onClose: () => void;
}

function getFocusColor(score: number) {
  if (score >= 75) return "#34d399";
  if (score >= 45) return "#fbbf24";
  return "#f87171";
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function ParticipantList({
  participants, myUserId, isHost, onKick, onMute, onClose,
}: ParticipantListProps) {
  const avg =
    participants.length > 0
      ? participants.reduce((s, p) => s + p.focusScore, 0) / participants.length
      : 0;
  const avgColor = getFocusColor(avg);

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col h-full glass-strong border-l border-border"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm tracking-tight">People</h3>
          <span className="text-2xs font-mono bg-secondary px-1.5 py-0.5 rounded-md text-muted-foreground">
            {participants.length}
          </span>
        </div>
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
        >
          <X size={14} />
        </motion.button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 min-h-0">
        {participants.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-12">
            <Users size={20} className="text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground font-mono">No participants</p>
          </div>
        )}

        <AnimatePresence>
          {participants.map((p) => {
            const isMe = p.userId === myUserId;
            const color = getFocusColor(p.focusScore);
            return (
              <motion.div
                key={p.userId}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/40 transition-colors group"
              >
                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-semibold flex-shrink-0"
                  style={{ background: `${color}15`, border: `1.5px solid ${color}30`, color }}
                >
                  {getInitials(p.displayName)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium truncate max-w-[120px]">{p.displayName}</span>
                    {isMe && <span className="text-2xs text-muted-foreground font-mono">you</span>}
                    {p.isHost && <Crown size={10} className="text-warning flex-shrink-0" />}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="text-2xs font-mono" style={{ color }}>
                      {Math.round(p.focusScore)}%
                    </span>
                  </div>
                </div>

                {/* Media status */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {p.audioEnabled
                    ? <Mic size={12} className="text-muted-foreground/50" />
                    : <MicOff size={12} className="text-destructive/70" />}
                  {p.videoEnabled
                    ? <Video size={12} className="text-muted-foreground/50" />
                    : <VideoOff size={12} className="text-destructive/70" />}
                </div>

                {/* Host actions */}
                {isHost && !isMe && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => onMute(p.userId)}
                      title="Mute"
                      className="w-6 h-6 rounded-lg bg-muted hover:bg-secondary flex items-center justify-center transition-colors"
                    >
                      <VolumeX size={10} className="text-muted-foreground" />
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => onKick(p.userId)}
                      title="Remove"
                      className="w-6 h-6 rounded-lg bg-destructive/15 hover:bg-destructive/30 flex items-center justify-center transition-colors"
                    >
                      <UserX size={10} className="text-destructive" />
                    </motion.button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Focus summary footer */}
      <div className="p-3.5 border-t border-border flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <p className="text-2xs font-mono text-muted-foreground uppercase tracking-widest">Group Focus</p>
          <span className="text-xs font-mono font-semibold" style={{ color: avgColor }}>
            {Math.round(avg)}%
          </span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${avg}%` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            style={{ background: avgColor }}
          />
        </div>
      </div>
    </motion.div>
  );
}
