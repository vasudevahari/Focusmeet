"use client";

import { AnimatePresence } from "framer-motion";
import { Participant } from "@/types";
import VideoTile from "./VideoTile";

interface VideoGridProps {
  participants: Participant[];
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  myUserId: string;
}

function gridClass(n: number) {
  if (n <= 1) return "grid-cols-1";
  if (n === 2) return "grid-cols-2";
  if (n <= 4) return "grid-cols-2";
  if (n <= 6) return "grid-cols-3";
  if (n <= 9) return "grid-cols-3";
  return "grid-cols-4";
}

export default function VideoGrid({ participants, localStream, remoteStreams, myUserId }: VideoGridProps) {
  const n = participants.length;

  return (
    <div
      className={`grid ${gridClass(n)} gap-2 w-full h-full p-2 auto-rows-fr`}
    >
      <AnimatePresence>
        {participants.map((p) => {
          const isLocal = p.userId === myUserId;
          const stream = isLocal ? localStream ?? undefined : remoteStreams.get(p.socketId);
          return (
            <VideoTile
              key={p.userId}
              participant={p}
              stream={stream}
              isLocal={isLocal}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}
