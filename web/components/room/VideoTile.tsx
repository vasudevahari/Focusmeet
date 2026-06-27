"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Participant } from "@/types";
import { MicOff, MonitorUp, Crown } from "lucide-react";

interface VideoTileProps {
  participant: Participant;
  stream?: MediaStream;
  isLocal?: boolean;
  isSpeaking?: boolean;
}

function getFocusColor(score: number) {
  if (score >= 75) return "#34d399";
  if (score >= 45) return "#fbbf24";
  return "#f87171";
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function VideoTile({ participant, stream, isLocal, isSpeaking }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const focusColor = getFocusColor(participant.focusScore);
  const showVideo = participant.videoEnabled && !!stream;

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="video-tile w-full h-full flex flex-col overflow-hidden"
      style={{
        outline: isSpeaking ? `2px solid ${focusColor}` : "2px solid transparent",
        transition: "outline 0.3s ease",
      }}
    >
      {/* Video / Avatar area */}
      <div className="relative flex-1 bg-card flex items-center justify-center overflow-hidden">
        {showVideo ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocal}
            className="w-full h-full object-cover"
            style={{ transform: isLocal ? "scaleX(-1)" : "none" }}
          />
        ) : (
          <div className="flex flex-col items-center gap-2.5">
            <motion.div
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-base font-semibold"
              style={{
                background: `${focusColor}18`,
                border: `1.5px solid ${focusColor}35`,
                color: focusColor,
              }}
            >
              {getInitials(participant.displayName)}
            </motion.div>
            <span className="text-xs text-muted-foreground font-mono">Camera off</span>
          </div>
        )}

        {/* Top badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-2 pointer-events-none">
          {/* Screen share badge */}
          {participant.isScreenSharing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 bg-primary/15 border border-primary/25 backdrop-blur-sm rounded-lg px-2 py-1"
            >
              <MonitorUp size={11} className="text-primary" />
              <span className="text-2xs text-primary font-mono">Sharing</span>
            </motion.div>
          )}
          <div className="flex-1" />
          {/* Focus score */}
          <motion.div
            key={Math.round(participant.focusScore)}
            initial={{ scale: 1.15 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-1.5 backdrop-blur-sm rounded-lg px-2 py-1"
            style={{
              background: `${focusColor}15`,
              border: `1px solid ${focusColor}35`,
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full pulse-dot"
              style={{ background: focusColor }}
            />
            <span className="text-2xs font-mono font-semibold" style={{ color: focusColor }}>
              {Math.round(participant.focusScore)}%
            </span>
          </motion.div>
        </div>

        {/* Bottom: muted indicator */}
        {!participant.audioEnabled && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute bottom-2.5 left-2.5 w-6 h-6 rounded-lg bg-destructive/90 backdrop-blur-sm flex items-center justify-center"
          >
            <MicOff size={11} className="text-white" />
          </motion.div>
        )}
      </div>

      {/* Name bar */}
      <div className="px-2.5 py-2 flex items-center gap-2 bg-card/80 backdrop-blur-sm">
        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: focusColor }} />
        <span className="text-xs font-medium truncate flex-1 min-w-0">
          {participant.displayName}
          {isLocal && <span className="text-muted-foreground/60 ml-1 font-normal">you</span>}
        </span>
        {participant.isHost && (
          <Crown size={11} className="text-warning flex-shrink-0" />
        )}
      </div>
    </motion.div>
  );
}
