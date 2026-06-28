"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Participant } from "@/types";
import VideoTile from "./VideoTile";
import { useState, useMemo } from "react";

interface VideoGridProps {
  participants: Participant[];
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  myUserId: string;
}

function gridClass(n: number) {
  if (n === 0) return "grid-cols-1";
  if (n === 1) return "grid-cols-1";
  if (n === 2) return "grid-cols-2";
  if (n === 3) return "grid-cols-3";
  if (n === 4) return "grid-cols-2";
  if (n <= 6) return "grid-cols-3";
  if (n <= 9) return "grid-cols-3";
  return "grid-cols-4";
}

export default function VideoGrid({ 
  participants, 
  localStream, 
  remoteStreams, 
  myUserId 
}: VideoGridProps) {
  const [focusedUserId, setFocusedUserId] = useState<string | null>(null);
  const n = participants.length;

  const sortedParticipants = useMemo(() => {
    if (focusedUserId) {
      return [
        participants.find(p => p.userId === focusedUserId),
        ...participants.filter(p => p.userId !== focusedUserId)
      ].filter(Boolean) as Participant[];
    }
    return participants;
  }, [participants, focusedUserId]);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-background">
      {/* Focused view (if active) */}
      {focusedUserId && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "60%", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="flex-shrink-0 border-b border-border overflow-hidden"
        >
          <div className="w-full h-full flex items-center justify-center bg-secondary/30">
            <AnimatePresence>
              {sortedParticipants.slice(0, 1).map((p) => {
                const isLocal = p.userId === myUserId;
                const stream = isLocal ? localStream ?? undefined : remoteStreams.get(p.socketId);
                return (
                  <div key={p.userId} className="w-full h-full">
                    <VideoTile
                      participant={p}
                      stream={stream}
                      isLocal={isLocal}
                      isFocused
                      onFocusToggle={() => setFocusedUserId(null)}
                    />
                  </div>
                );
              })}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* Grid view (thumbnails) */}
      <div className="flex-1 overflow-hidden">
        <div className={`grid ${gridClass(focusedUserId ? n - 1 : n)} gap-2 w-full h-full p-2 auto-rows-fr`}>
          <AnimatePresence>
            {sortedParticipants.slice(focusedUserId ? 1 : 0).map((p) => {
              const isLocal = p.userId === myUserId;
              const stream = isLocal ? localStream ?? undefined : remoteStreams.get(p.socketId);
              return (
                <motion.div
                  key={p.userId}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setFocusedUserId(p.userId)}
                  className="cursor-pointer"
                >
                  <VideoTile
                    participant={p}
                    stream={stream}
                    isLocal={isLocal}
                    onFocusToggle={() => setFocusedUserId(p.userId)}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
