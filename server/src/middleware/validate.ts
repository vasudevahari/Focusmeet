import { Request, Response, NextFunction } from "express";

export function sanitizeStr(s: unknown, maxLen = 100): string {
  if (typeof s !== "string") return "";
  return s.trim().replace(/[\x00-\x1F\x7F]/g, "").slice(0, maxLen);
}

export function validateCreateRoom(req: Request, res: Response, next: NextFunction) {
  const cleanName = sanitizeStr(req.body.name, 80);
  const cleanHost = sanitizeStr(req.body.hostName, 50);
  if (!cleanName) return res.status(400).json({ error: "Meeting name required (max 80 chars)" });
  if (!cleanHost) return res.status(400).json({ error: "Your name required (max 50 chars)" });
  req.body.name = cleanName;
  req.body.hostName = cleanHost;
  return next();
}

export function validateRoomCode(req: Request, res: Response, next: NextFunction) {
  if (!/^[A-Z0-9]{8}$/.test(req.params.roomCode || "")) {
    return res.status(400).json({ error: "Invalid room code" });
  }
  return next();
}

export function validateFocusLog(req: Request, res: Response, next: NextFunction) {
  const { meetingId, participantId, score, eventType } = req.body;
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(meetingId)) return res.status(400).json({ error: "Invalid meetingId" });
  if (!uuidRe.test(participantId)) return res.status(400).json({ error: "Invalid participantId" });
  const s = Number(score);
  if (isNaN(s) || s < 0 || s > 100) return res.status(400).json({ error: "Score must be 0-100" });
  const valid = ["looking_away", "face_absent", "eyes_closed"];
  if (eventType !== undefined && !valid.includes(eventType)) {
    return res.status(400).json({ error: "Invalid eventType" });
  }
  req.body.score = Math.round(s);
  return next();
}
