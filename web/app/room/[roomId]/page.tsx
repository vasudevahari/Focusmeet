"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useRoom } from "@/hooks/useRoom";
import { useFocusMonitor } from "@/hooks/useFocusMonitor";
import VideoGrid from "@/components/room/VideoGrid";
import ControlBar from "@/components/room/ControlBar";
import ChatPanel from "@/components/room/ChatPanel";
import ParticipantList from "@/components/room/ParticipantList";
import FocusAIWorker from "@/components/room/FocusAIWorker";
import HostFocusDashboard from "@/components/room/HostFocusDashboard";
import FocusNotification from "@/components/room/FocusNotification";
import ThemeToggle from "@/components/ThemeToggle";
import { endRoom } from "@/lib/api";
import { FocusEvent } from "@/types";
import { Video, Loader2, AlertTriangle, BarChart2 } from "lucide-react";

type Panel = "chat" | "participants" | "focus" | null;

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = (params.roomId as string).toUpperCase();

  const [panel, setPanel] = useState<Panel>(null);
  const [exited, setExited] = useState(false);

  const {
    focusData, notifications, handleFocusEvent,
    handleFocusUpdate, sendFocusScore: _s, sendFocusEvent: _e,
    dismissNotification, getAggregateStats,
  } = useFocusMonitor(roomCode);

  const onFocusEvent = useCallback((data: any) => handleFocusEvent(data), [handleFocusEvent]);

  const {
    session, participants, messages, localStream, remoteStreams,
    audioEnabled, videoEnabled, isScreenSharing,
    isConnected, isKicked, roomEnded,
    toggleAudio, toggleVideo,
    startScreenShare, stopScreenShare,
    sendMessage, kickParticipant, muteParticipant,
    leaveRoom, endRoom: endRoomSocket,
    sendFocusScore, sendFocusEvent,
  } = useRoom(roomCode, onFocusEvent);

  useEffect(() => {
    const raw = sessionStorage.getItem(`focusmeet_${roomCode}`);
    if (!raw) router.replace("/");
  }, [roomCode, router]);

  useEffect(() => {
    if ((isKicked || roomEnded) && !exited) {
      setExited(true);
      leaveRoom();
      setTimeout(() => router.replace("/"), 2000);
    }
  }, [isKicked, roomEnded, exited, leaveRoom, router]);

  const handleFocusScore = useCallback((score: number) => {
    if (!session) return;
    sendFocusScore(score);
    handleFocusUpdate(session.userId, session.displayName, score);
  }, [session, sendFocusScore, handleFocusUpdate]);

  const handleFocusAIEvent = useCallback((event: FocusEvent) => {
    if (!session) return;
    sendFocusEvent(event);
    if (session.isHost) {
      handleFocusEvent({ userId: session.userId, displayName: session.displayName,
        eventType: event.type, message: event.message, timestamp: event.timestamp });
    }
  }, [session, sendFocusEvent, handleFocusEvent]);

  function togglePanel(p: Panel) {
    setPanel((cur) => (cur === p ? null : p));
  }

  const stats = getAggregateStats();

  /* ── Loading / error states ─────────────────────────────── */
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={24} />
      </div>
    );
  }

  if (isKicked || roomEnded) {
    const sess = typeof window !== "undefined"
      ? JSON.parse(sessionStorage.getItem(`focusmeet_${roomCode}`) ?? "{}")
      : null;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-strong rounded-2xl p-8 text-center max-w-sm mx-4 space-y-4 shadow-float"
        >
          <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mx-auto">
            {isKicked
              ? <AlertTriangle size={22} className="text-destructive" />
              : <Video size={22} className="text-muted-foreground" />
            }
          </div>
          <div>
            <h2 className="font-semibold mb-1 tracking-tight">
              {isKicked ? "Removed from meeting" : "Meeting ended"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isKicked ? "The host removed you." : "The host has ended this session."}
            </p>
          </div>
          {!isKicked && sess?.isHost && sess?.meetingId && (
            <a
              href={`/analytics/${sess.meetingId}`}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
            >
              <BarChart2 size={14} />
              View Meeting Report
            </a>
          )}
          <p className="text-xs text-muted-foreground font-mono">Redirecting to home...</p>
        </motion.div>
      </div>
    );
  }

  /* ── Main room ──────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">

      {/* Top bar */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center justify-between px-4 py-2.5 glass-strong border-b border-border flex-shrink-0 z-10"
      >
        {/* Left: logo + room */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-primary rounded-xl blur-md opacity-30" />
            <div className="relative w-7 h-7 rounded-xl bg-primary flex items-center justify-center">
              <Video size={13} className="text-white" strokeWidth={2.5} />
            </div>
          </div>
          <div className="hidden sm:block w-px h-4 bg-border" />
          <div className="hidden sm:block">
            <p className="text-2xs font-mono text-muted-foreground uppercase tracking-widest">Room</p>
            <p className="text-sm font-mono font-semibold tracking-[0.12em]">{roomCode}</p>
          </div>
        </div>

        {/* Right: status + theme */}
        <div className="flex items-center gap-2.5">
          {session.isHost && (
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => togglePanel("focus")}
              className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono transition-all border ${
                panel === "focus"
                  ? "bg-primary/15 text-primary border-primary/30"
                  : "bg-secondary/60 text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              <BarChart2 size={12} />
              <span
                className="font-semibold"
                style={{
                  color: stats.avg >= 75 ? "#34d399" : stats.avg >= 45 ? "#fbbf24" : "#f87171",
                }}
              >
                {stats.avg}%
              </span>
            </motion.button>
          )}

          <div className="flex items-center gap-1.5">
            <motion.div
              animate={{ scale: isConnected ? [1, 1.3, 1] : 1 }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-2 h-2 rounded-full"
              style={{ background: isConnected ? "#34d399" : "#6b7280" }}
            />
            <span className="text-2xs font-mono text-muted-foreground hidden sm:inline">
              {isConnected ? "Live" : "Connecting..."}
            </span>
          </div>

          <ThemeToggle />
        </div>
      </motion.div>

      {/* Content: video + panels */}
      <div className="flex flex-1 overflow-hidden">

        {/* Video grid */}
        <div className="flex-1 overflow-hidden relative">
          <VideoGrid
            participants={participants}
            localStream={localStream}
            remoteStreams={remoteStreams}
            myUserId={session.userId}
          />

          {/* Empty room placeholder */}
          {participants.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mx-auto">
                  <Video size={20} className="text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground font-mono">Waiting for others...</p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Side panel */}
        <AnimatePresence>
          {panel === "chat" && (
            <div key="chat" className="w-72 flex-shrink-0 h-full">
              <ChatPanel
                messages={messages}
                myUserId={session.userId}
                onSend={sendMessage}
                onClose={() => setPanel(null)}
              />
            </div>
          )}
          {panel === "participants" && (
            <div key="participants" className="w-60 flex-shrink-0 h-full">
              <ParticipantList
                participants={participants}
                myUserId={session.userId}
                isHost={session.isHost}
                onKick={kickParticipant}
                onMute={muteParticipant}
                onClose={() => setPanel(null)}
              />
            </div>
          )}
          {panel === "focus" && session.isHost && (
            <div key="focus" className="flex-shrink-0 h-full">
              <HostFocusDashboard
                focusData={focusData}
                totalParticipants={participants.length}
                onClose={() => setPanel(null)}
              />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Control bar */}
      <ControlBar
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled}
        isScreenSharing={isScreenSharing}
        isHost={session.isHost}
        roomCode={roomCode}
        participantCount={participants.length}
        showChat={panel === "chat"}
        showParticipants={panel === "participants"}
        showFocusDash={panel === "focus"}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={() => isScreenSharing ? stopScreenShare() : startScreenShare()}
        onToggleChat={() => togglePanel("chat")}
        onToggleParticipants={() => togglePanel("participants")}
        onToggleFocusDash={() => togglePanel("focus")}
        onLeave={() => { leaveRoom(); router.replace("/"); }}
        onEnd={async () => {
          endRoomSocket();
          await endRoom(roomCode, session.userId).catch(() => {});
          router.replace("/");
        }}
      />

      {/* Invisible focus AI */}
      <FocusAIWorker
        localStream={localStream}
        onFocusScore={handleFocusScore}
        onFocusEvent={handleFocusAIEvent}
        enabled={isConnected}
      />

      {/* Host notifications */}
      {session.isHost && (
        <FocusNotification notifications={notifications} onDismiss={dismissNotification} />
      )}
    </div>
  );
}
