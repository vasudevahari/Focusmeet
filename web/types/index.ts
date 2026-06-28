export interface Participant {
  userId: string;
  displayName: string;
  socketId: string;
  isHost: boolean;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isScreenSharing: boolean;
  focusScore: number;
  joinedAt: number;
  stream?: MediaStream;
  isActive?: boolean;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  sentAt: string;
  senderId?: string;
  recipientId?: string;
}

export interface RoomInfo {
  roomCode: string;
  roomName: string;
  hostName: string;
  meetingId: string | null;
  isActive: boolean;
}

export interface CreateRoomResponse {
  roomCode: string;
  roomName: string;
  hostId: string;
  meetingId: string;
}

export interface FocusEvent {
  type: "looking_away" | "face_absent" | "eyes_closed";
  message: string;
  timestamp: number;
}

export interface FocusSnapshot {
  timestamp: number;
  score: number;
}

export interface ParticipantFocusData {
  userId: string;
  displayName: string;
  currentScore: number;
  timeline: FocusSnapshot[];
  warningCount: number;
  events: FocusEvent[];
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface TimelineBucket {
  offsetMs: number;
  avgScore: number;
  label: string;
}

export interface ParticipantReport {
  participantId: string;
  userId: string;
  displayName: string;
  joinedAt: string;
  leftAt: string | null;
  avgScore: number;
  focusedSecs: number;
  distractedSecs: number;
  unfocusedSecs: number;
  alertCount: number;
  alertsByType: Record<string, number>;
  timeline: TimelineBucket[];
}

export interface MeetingAnalytics {
  meetingId: string;
  roomName: string;
  roomCode: string;
  startedAt: string;
  endedAt: string | null;
  durationMs: number;
  participantCount: number;
  overallAvgScore: number;
  totalAlerts: number;
  groupTimeline: TimelineBucket[];
  participants: ParticipantReport[];
}

export interface MeetingHistoryItem {
  meetingId: string;
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
  participantCount: number;
  avgFocusScore: number | null;
}

export interface RoomHistory {
  roomName: string;
  roomCode: string;
  meetings: MeetingHistoryItem[];
}
