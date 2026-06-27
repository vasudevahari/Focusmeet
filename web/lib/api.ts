import { CreateRoomResponse, RoomInfo } from "@/types";

const BASE = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";

export async function createRoom(name: string, hostName: string): Promise<CreateRoomResponse> {
  const res = await fetch(`${BASE}/api/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, hostName }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to create room");
  }
  return res.json();
}

export async function getRoom(roomCode: string): Promise<RoomInfo> {
  const res = await fetch(`${BASE}/api/rooms/${roomCode}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Room not found");
  }
  return res.json();
}

export async function endRoom(roomCode: string, hostId: string): Promise<void> {
  await fetch(`${BASE}/api/rooms/${roomCode}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hostId }),
  });
}

// ─── Analytics ────────────────────────────────────────────────────────────────
import type { MeetingAnalytics, RoomHistory } from "@/types";

export async function getMeetingAnalytics(meetingId: string): Promise<MeetingAnalytics> {
  const res = await fetch(`${BASE}/api/analytics/meeting/${meetingId}`);
  if (!res.ok) throw new Error("Failed to fetch analytics");
  return res.json();
}

export async function getRoomHistory(roomCode: string): Promise<RoomHistory> {
  const res = await fetch(`${BASE}/api/analytics/room/${roomCode}/history`);
  if (!res.ok) throw new Error("Failed to fetch room history");
  return res.json();
}

export async function postFocusLog(data: {
  meetingId: string;
  participantId: string;
  score: number;
  eventType?: string;
}): Promise<void> {
  await fetch(`${BASE}/api/analytics/focus-log`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
