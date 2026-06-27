import { Server, Socket } from "socket.io";
import { prisma } from "../lib/prisma";

interface Participant {
  userId: string;
  displayName: string;
  socketId: string;
  isHost: boolean;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isScreenSharing: boolean;
  focusScore: number;
  joinedAt: number;
}

// In-memory room state
const rooms = new Map<string, Map<string, Participant>>();

// Per-socket rate limiting for focus updates (max 10/sec)
const focusRateLimits = new Map<string, number>();

function sanitize(s: unknown, max = 80): string {
  if (typeof s !== "string") return "";
  return s.trim().replace(/[\x00-\x1F\x7F<>]/g, "").slice(0, max);
}

function isValidUUID(s: unknown): boolean {
  return typeof s === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function isValidRoomCode(s: unknown): boolean {
  return typeof s === "string" && /^[A-Z0-9]{8}$/.test(s);
}

function getSocketParticipant(socket: Socket): { roomCode: string; userId: string } | null {
  const roomCode = (socket as any)._roomCode;
  const userId = (socket as any)._userId;
  if (!roomCode || !userId) return null;
  return { roomCode, userId };
}

export function registerRoomHandlers(io: Server, socket: Socket) {

  // ── room:join ──────────────────────────────────────────────────
  socket.on("room:join", async (data: unknown) => {
    try {
      if (!data || typeof data !== "object") return;
      const { roomCode: rc, userId, displayName: dn, isHost, meetingId } = data as any;

      const roomCode = sanitize(rc, 8).toUpperCase();
      const displayName = sanitize(dn, 50);

      if (!isValidRoomCode(roomCode)) return;
      if (!isValidUUID(userId)) return;
      if (!displayName) return;

      socket.join(roomCode);

      if (!rooms.has(roomCode)) rooms.set(roomCode, new Map());
      const roomParticipants = rooms.get(roomCode)!;

      const participant: Participant = {
        userId,
        displayName,
        socketId: socket.id,
        isHost: Boolean(isHost),
        audioEnabled: true,
        videoEnabled: true,
        isScreenSharing: false,
        focusScore: 100,
        joinedAt: Date.now(),
      };

      roomParticipants.set(userId, participant);

      // Persist to DB (non-blocking)
      if (isValidUUID(meetingId)) {
        prisma.participant.create({
          data: { meetingId, userId, displayName },
        }).catch(() => {});
      }

      socket.emit("room:state", { participants: Array.from(roomParticipants.values()) });
      socket.to(roomCode).emit("participant:joined", participant);

      // Bind context to socket for cleanup
      (socket as any)._roomCode = roomCode;
      (socket as any)._userId = userId;
      (socket as any)._meetingId = meetingId;
    } catch (err) {
      console.error("[socket] room:join error:", err);
    }
  });

  // ── room:leave ────────────────────────────────────────────────
  socket.on("room:leave", (data: unknown) => {
    const ctx = getSocketParticipant(socket);
    if (!ctx) return;
    handleLeave(io, socket, ctx.roomCode, ctx.userId);
  });

  // ── room:end (host only) ──────────────────────────────────────
  socket.on("room:end", (data: unknown) => {
    const ctx = getSocketParticipant(socket);
    if (!ctx) return;
    const p = rooms.get(ctx.roomCode)?.get(ctx.userId);
    if (!p?.isHost) return; // only host can end

    io.to(ctx.roomCode).emit("room:ended");
    rooms.get(ctx.roomCode)?.clear();
    rooms.delete(ctx.roomCode);
  });

  // ── media:toggle ──────────────────────────────────────────────
  socket.on("media:toggle", (data: unknown) => {
    const ctx = getSocketParticipant(socket);
    if (!ctx) return;
    if (!data || typeof data !== "object") return;
    const { type, enabled } = data as any;
    if (type !== "audio" && type !== "video") return;

    const p = rooms.get(ctx.roomCode)?.get(ctx.userId);
    if (!p) return;
    if (type === "audio") p.audioEnabled = Boolean(enabled);
    if (type === "video") p.videoEnabled = Boolean(enabled);
    io.to(ctx.roomCode).emit("media:toggled", { userId: ctx.userId, type, enabled: Boolean(enabled) });
  });

  // ── screen:start ──────────────────────────────────────────────
  socket.on("screen:start", () => {
    const ctx = getSocketParticipant(socket);
    if (!ctx) return;
    const p = rooms.get(ctx.roomCode)?.get(ctx.userId);
    if (p) { p.isScreenSharing = true; io.to(ctx.roomCode).emit("screen:started", { userId: ctx.userId }); }
  });

  // ── screen:stop ───────────────────────────────────────────────
  socket.on("screen:stop", () => {
    const ctx = getSocketParticipant(socket);
    if (!ctx) return;
    const p = rooms.get(ctx.roomCode)?.get(ctx.userId);
    if (p) { p.isScreenSharing = false; io.to(ctx.roomCode).emit("screen:stopped", { userId: ctx.userId }); }
  });

  // ── focus:update (rate-limited to 4/s per socket) ─────────────
  socket.on("focus:update", (data: unknown) => {
    const ctx = getSocketParticipant(socket);
    if (!ctx) return;

    const now = Date.now();
    const last = focusRateLimits.get(socket.id) ?? 0;
    if (now - last < 250) return; // max 4 updates/sec
    focusRateLimits.set(socket.id, now);

    if (!data || typeof data !== "object") return;
    const { score } = data as any;
    const s = Number(score);
    if (isNaN(s) || s < 0 || s > 100) return;

    const p = rooms.get(ctx.roomCode)?.get(ctx.userId);
    if (p) {
      p.focusScore = Math.round(s);
      io.to(ctx.roomCode).emit("focus:updated", { userId: ctx.userId, score: p.focusScore });
    }
  });

  // ── focus:event → host only ───────────────────────────────────
  socket.on("focus:event", (data: unknown) => {
    const ctx = getSocketParticipant(socket);
    if (!ctx) return;
    if (!data || typeof data !== "object") return;

    const { eventType, message } = data as any;
    const validEvents = ["looking_away", "face_absent", "eyes_closed"];
    if (!validEvents.includes(eventType)) return;

    const roomParticipants = rooms.get(ctx.roomCode);
    if (!roomParticipants) return;
    const host = Array.from(roomParticipants.values()).find((p) => p.isHost);
    if (!host || host.userId === ctx.userId) {
      // If sender IS host, handle locally — already done client-side
      return;
    }

    const senderName = roomParticipants.get(ctx.userId)?.displayName ?? "Someone";
    io.to(host.socketId).emit("focus:event", {
      userId: ctx.userId,
      displayName: senderName,
      eventType,
      message: sanitize(message, 120),
      timestamp: Date.now(),
    });
  });

  // ── host:kick ─────────────────────────────────────────────────
  socket.on("host:kick", (data: unknown) => {
    const ctx = getSocketParticipant(socket);
    if (!ctx) return;
    const me = rooms.get(ctx.roomCode)?.get(ctx.userId);
    if (!me?.isHost) return;

    if (!data || typeof data !== "object") return;
    const { targetUserId } = data as any;
    if (!isValidUUID(targetUserId) || targetUserId === ctx.userId) return;

    const target = rooms.get(ctx.roomCode)?.get(targetUserId);
    if (target) {
      io.to(target.socketId).emit("participant:kicked");
      rooms.get(ctx.roomCode)?.delete(targetUserId);
      io.to(ctx.roomCode).emit("participant:left", { userId: targetUserId });
    }
  });

  // ── host:mute ─────────────────────────────────────────────────
  socket.on("host:mute", (data: unknown) => {
    const ctx = getSocketParticipant(socket);
    if (!ctx) return;
    const me = rooms.get(ctx.roomCode)?.get(ctx.userId);
    if (!me?.isHost) return;

    if (!data || typeof data !== "object") return;
    const { targetUserId } = data as any;
    if (!isValidUUID(targetUserId) || targetUserId === ctx.userId) return;

    const target = rooms.get(ctx.roomCode)?.get(targetUserId);
    if (target) {
      io.to(target.socketId).emit("participant:muted");
      target.audioEnabled = false;
      io.to(ctx.roomCode).emit("media:toggled", { userId: targetUserId, type: "audio", enabled: false });
    }
  });

  // ── WebRTC signaling ──────────────────────────────────────────
  socket.on("webrtc:offer", (data: unknown) => {
    if (!data || typeof data !== "object") return;
    const { to, offer } = data as any;
    if (typeof to !== "string") return;
    socket.to(to).emit("webrtc:offer", { from: socket.id, offer });
  });

  socket.on("webrtc:answer", (data: unknown) => {
    if (!data || typeof data !== "object") return;
    const { to, answer } = data as any;
    if (typeof to !== "string") return;
    socket.to(to).emit("webrtc:answer", { from: socket.id, answer });
  });

  socket.on("webrtc:ice", (data: unknown) => {
    if (!data || typeof data !== "object") return;
    const { to, candidate } = data as any;
    if (typeof to !== "string") return;
    socket.to(to).emit("webrtc:ice", { from: socket.id, candidate });
  });

  // ── disconnect ────────────────────────────────────────────────
  socket.on("disconnect", () => {
    const ctx = getSocketParticipant(socket);
    focusRateLimits.delete(socket.id);
    if (ctx) handleLeave(io, socket, ctx.roomCode, ctx.userId);
  });
}

function handleLeave(io: Server, socket: Socket, roomCode: string, userId: string) {
  socket.leave(roomCode);
  rooms.get(roomCode)?.delete(userId);
  io.to(roomCode).emit("participant:left", { userId });
  // Clean up empty rooms
  if ((rooms.get(roomCode)?.size ?? 0) === 0) rooms.delete(roomCode);
}
