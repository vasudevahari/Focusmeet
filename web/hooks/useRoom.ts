"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getSocket, destroySocket } from "@/lib/socket";
import { WebRTCManager } from "@/lib/webrtc";
import { Participant, ChatMessage, FocusEvent } from "@/types";

interface RoomSession {
  userId: string;
  displayName: string;
  isHost: boolean;
  meetingId: string;
}

export function useRoom(roomCode: string, onFocusEvent?: (data: any) => void) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isKicked, setIsKicked] = useState(false);
  const [roomEnded, setRoomEnded] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());

  const sessionRef = useRef<RoomSession | null>(null);
  const webrtcRef = useRef<WebRTCManager | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);
  const joinedRef = useRef(false);

  // Parse session once
  useEffect(() => {
    const raw = sessionStorage.getItem(`focusmeet_${roomCode}`);
    if (raw) {
      try { sessionRef.current = JSON.parse(raw); } catch (_) {}
    }
    return () => { mountedRef.current = false; };
  }, [roomCode]);

  // ── Media init ────────────────────────────────────────────────
  useEffect(() => {
    let stream: MediaStream | null = null;

    async function initMedia() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      } catch (_) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (mountedRef.current) setVideoEnabled(false);
        } catch (__) {
          console.warn("[media] no devices available");
          return;
        }
      }
      if (!mountedRef.current) { stream?.getTracks().forEach((t) => t.stop()); return; }
      localStreamRef.current = stream;
      setLocalStream(stream);
    }

    initMedia();

    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    };
  }, []);

  // ── Socket + WebRTC ───────────────────────────────────────────
  useEffect(() => {
    if (!localStreamRef.current && !localStream) return;
    if (!sessionRef.current) return;
    if (joinedRef.current) return;
    joinedRef.current = true;

    const socket = getSocket();
    if (!socket.connected) socket.connect();

    const handleConnect = () => {
      if (!mountedRef.current) return;
      setIsConnected(true);

      webrtcRef.current = new WebRTCManager(
        socket,
        socket.id!,
        (socketId, stream) => {
          if (!mountedRef.current) return;
          setRemoteStreams((prev) => new Map(prev).set(socketId, stream));
        },
        (socketId) => {
          if (!mountedRef.current) return;
          setRemoteStreams((prev) => { const n = new Map(prev); n.delete(socketId); return n; });
        }
      );

      const s = localStreamRef.current || localStream;
      if (s) webrtcRef.current.setLocalStream(s);

      const sess = sessionRef.current!;
      socket.emit("room:join", {
        roomCode,
        userId: sess.userId,
        displayName: sess.displayName,
        isHost: sess.isHost,
        meetingId: sess.meetingId,
      });
    };

    const handleDisconnect = () => {
      if (mountedRef.current) setIsConnected(false);
    };

    const handleRoomState = ({ participants: ps }: { participants: Participant[] }) => {
      if (!mountedRef.current) return;
      setParticipants(ps);
      ps.forEach((p) => {
        if (p.socketId !== socket.id && p.socketId) {
          webrtcRef.current?.connectToPeer(p.socketId);
        }
      });
    };

    const handleParticipantJoined = (p: Participant) => {
      if (!mountedRef.current) return;
      setParticipants((prev) => prev.find((x) => x.userId === p.userId) ? prev : [...prev, p]);
      if (p.socketId !== socket.id) webrtcRef.current?.connectToPeer(p.socketId);
    };

    const handleParticipantLeft = ({ userId }: { userId: string }) => {
      if (!mountedRef.current) return;
      setParticipants((prev) => prev.filter((p) => p.userId !== userId));
    };

    const handleMediaToggled = ({ userId, type, enabled }: { userId: string; type: string; enabled: boolean }) => {
      if (!mountedRef.current) return;
      setParticipants((prev) => prev.map((p) =>
        p.userId === userId
          ? { ...p, audioEnabled: type === "audio" ? enabled : p.audioEnabled, videoEnabled: type === "video" ? enabled : p.videoEnabled }
          : p
      ));
    };

    const handleScreenStarted = ({ userId }: { userId: string }) => {
      if (!mountedRef.current) return;
      setParticipants((prev) => prev.map((p) => p.userId === userId ? { ...p, isScreenSharing: true } : p));
    };

    const handleScreenStopped = ({ userId }: { userId: string }) => {
      if (!mountedRef.current) return;
      setParticipants((prev) => prev.map((p) => p.userId === userId ? { ...p, isScreenSharing: false } : p));
    };

    const handleFocusUpdated = ({ userId, score }: { userId: string; score: number }) => {
      if (!mountedRef.current) return;
      setParticipants((prev) => prev.map((p) => p.userId === userId ? { ...p, focusScore: score } : p));
    };

    const handleChatMessage = (msg: ChatMessage) => {
      if (!mountedRef.current) return;
      setMessages((prev) => [...prev, msg]);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("room:state", handleRoomState);
    socket.on("participant:joined", handleParticipantJoined);
    socket.on("participant:left", handleParticipantLeft);
    socket.on("media:toggled", handleMediaToggled);
    socket.on("screen:started", handleScreenStarted);
    socket.on("screen:stopped", handleScreenStopped);
    socket.on("focus:updated", handleFocusUpdated);
    socket.on("focus:event", (data: any) => onFocusEvent?.(data));
    socket.on("chat:message", handleChatMessage);
    socket.on("participant:kicked", () => mountedRef.current && setIsKicked(true));
    socket.on("participant:muted", () => {
      if (!mountedRef.current || !localStreamRef.current) return;
      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = false));
      setAudioEnabled(false);
    });
    socket.on("room:ended", () => mountedRef.current && setRoomEnded(true));

    // If already connected (reconnect scenario)
    if (socket.connected) handleConnect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("room:state", handleRoomState);
      socket.off("participant:joined", handleParticipantJoined);
      socket.off("participant:left", handleParticipantLeft);
      socket.off("media:toggled", handleMediaToggled);
      socket.off("screen:started", handleScreenStarted);
      socket.off("screen:stopped", handleScreenStopped);
      socket.off("focus:updated", handleFocusUpdated);
      socket.off("focus:event");
      socket.off("chat:message", handleChatMessage);
      socket.off("participant:kicked");
      socket.off("participant:muted");
      socket.off("room:ended");
      webrtcRef.current?.disconnect();
      webrtcRef.current = null;
      destroySocket();
      setIsConnected(false);
      joinedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStream, roomCode]);

  // ── Actions ───────────────────────────────────────────────────
  const toggleAudio = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream || !sessionRef.current) return;
    const enabled = !audioEnabled;
    stream.getAudioTracks().forEach((t) => (t.enabled = enabled));
    setAudioEnabled(enabled);
    getSocket().emit("media:toggle", { type: "audio", enabled });
  }, [audioEnabled]);

  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream || !sessionRef.current) return;
    const enabled = !videoEnabled;
    stream.getVideoTracks().forEach((t) => (t.enabled = enabled));
    setVideoEnabled(enabled);
    getSocket().emit("media:toggle", { type: "video", enabled });
  }, [videoEnabled]);

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      screenStreamRef.current = stream;
      setScreenStream(stream);
      setIsScreenSharing(true);
      const videoTrack = stream.getVideoTracks()[0];
      webrtcRef.current?.replaceTrack(videoTrack);
      getSocket().emit("screen:start");
      videoTrack.onended = () => stopScreenShare();
    } catch (_) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopScreenShare = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setScreenStream(null);
    setIsScreenSharing(false);
    const camTrack = localStreamRef.current?.getVideoTracks()[0];
    if (camTrack) webrtcRef.current?.replaceTrack(camTrack);
    getSocket().emit("screen:stop");
  }, []);

  const sendMessage = useCallback((content: string) => {
    const sess = sessionRef.current;
    if (!sess || !content.trim()) return;
    getSocket().emit("chat:message", {
      roomCode,
      userId: sess.userId,
      userName: sess.displayName,
      content: content.trim().slice(0, 1000),
      meetingId: sess.meetingId,
    });
  }, [roomCode]);

  const kickParticipant = useCallback((targetUserId: string) => {
    getSocket().emit("host:kick", { targetUserId });
  }, []);

  const muteParticipant = useCallback((targetUserId: string) => {
    getSocket().emit("host:mute", { targetUserId });
  }, []);

  const leaveRoom = useCallback(() => {
    const sess = sessionRef.current;
    if (sess) getSocket().emit("room:leave", { roomCode, userId: sess.userId });
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    webrtcRef.current?.disconnect();
    destroySocket();
  }, [roomCode]);

  const endRoom = useCallback(() => {
    getSocket().emit("room:end");
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    webrtcRef.current?.disconnect();
    destroySocket();
  }, []);

  const sendFocusScore = useCallback((score: number) => {
    getSocket().emit("focus:update", { score });
  }, []);

  const sendFocusEvent = useCallback((event: FocusEvent) => {
    getSocket().emit("focus:event", {
      eventType: event.type,
      message: event.message,
      timestamp: event.timestamp,
    });
  }, []);

  return {
    session: sessionRef.current,
    participants,
    messages,
    localStream,
    screenStream,
    remoteStreams,
    audioEnabled,
    videoEnabled,
    isScreenSharing,
    isConnected,
    isKicked,
    roomEnded,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    sendMessage,
    kickParticipant,
    muteParticipant,
    leaveRoom,
    endRoom,
    sendFocusScore,
    sendFocusEvent,
  };
}
