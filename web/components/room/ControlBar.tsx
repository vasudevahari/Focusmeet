"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, MicOff, Video, VideoOff,
  MonitorUp, MonitorOff, MessageSquare,
  Users, PhoneOff, Copy, Check, BarChart2,
} from "lucide-react";

interface ControlBarProps {
  audioEnabled: boolean;
  videoEnabled: boolean;
  isScreenSharing: boolean;
  isHost: boolean;
  roomCode: string;
  participantCount: number;
  showChat: boolean;
  showParticipants: boolean;
  showFocusDash?: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  onToggleFocusDash?: () => void;
  onLeave: () => void;
  onEnd: () => void;
}

function Btn({
  onClick, active, danger, subtle, label, badge, children,
}: {
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  subtle?: boolean;
  label: string;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-col items-center gap-1">
      <motion.button
        whileTap={{ scale: 0.88 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        onClick={onClick}
        title={label}
        className={`ctrl-btn ${
          danger
            ? "bg-destructive/90 hover:bg-destructive text-white"
            : active
            ? "bg-primary/15 text-primary border border-primary/30"
            : subtle
            ? "bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border"
            : "bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border"
        } transition-colors duration-150`}
      >
        {children}
        {badge != null && badge > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[9px] font-bold text-white flex items-center justify-center">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </motion.button>
      <span className="text-2xs text-muted-foreground/60 font-mono hidden sm:block whitespace-nowrap">
        {label}
      </span>
    </div>
  );
}

export default function ControlBar({
  audioEnabled, videoEnabled, isScreenSharing, isHost,
  roomCode, participantCount, showChat, showParticipants, showFocusDash,
  onToggleAudio, onToggleVideo, onToggleScreenShare,
  onToggleChat, onToggleParticipants, onToggleFocusDash,
  onLeave, onEnd,
}: ControlBarProps) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center justify-between px-4 py-3 glass-strong border-t border-border gap-3"
    >
      {/* Room info */}
      <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
        <div className="hidden sm:block">
          <p className="text-2xs font-mono text-muted-foreground uppercase tracking-widest">Room</p>
          <p className="text-sm font-mono font-semibold tracking-[0.15em]">{roomCode}</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={copyLink}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
        >
          <AnimatePresence mode="wait" initial={false}>
            {copied ? (
              <motion.span key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <Check size={12} className="text-success" />
              </motion.span>
            ) : (
              <motion.span key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <Copy size={12} />
              </motion.span>
            )}
          </AnimatePresence>
          <span className="hidden sm:inline">{copied ? "Copied!" : "Copy link"}</span>
        </motion.button>
      </div>

      {/* Center controls */}
      <div className="flex items-center gap-2">
        <Btn
          onClick={onToggleAudio}
          active={!audioEnabled}
          label={audioEnabled ? "Mute" : "Unmute"}
        >
          {audioEnabled ? <Mic size={17} /> : <MicOff size={17} />}
        </Btn>

        <Btn
          onClick={onToggleVideo}
          active={!videoEnabled}
          label={videoEnabled ? "Stop cam" : "Start cam"}
        >
          {videoEnabled ? <Video size={17} /> : <VideoOff size={17} />}
        </Btn>

        <Btn
          onClick={onToggleScreenShare}
          active={isScreenSharing}
          label={isScreenSharing ? "Stop share" : "Share"}
        >
          {isScreenSharing ? <MonitorOff size={17} /> : <MonitorUp size={17} />}
        </Btn>

        <div className="w-px h-7 bg-border mx-1" />

        <Btn onClick={onToggleChat} active={showChat} label="Chat">
          <MessageSquare size={17} />
        </Btn>

        <Btn
          onClick={onToggleParticipants}
          active={showParticipants}
          label="People"
          badge={participantCount}
        >
          <Users size={17} />
        </Btn>

        {isHost && onToggleFocusDash && (
          <Btn onClick={onToggleFocusDash} active={showFocusDash} label="Focus">
            <BarChart2 size={17} />
          </Btn>
        )}
      </div>

      {/* End / Leave */}
      <div className="flex-shrink-0">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={isHost ? onEnd : onLeave}
          className="flex items-center gap-2 bg-destructive/90 hover:bg-destructive text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
        >
          <PhoneOff size={15} />
          <span className="hidden sm:inline">{isHost ? "End" : "Leave"}</span>
        </motion.button>
      </div>
    </motion.div>
  );
}
