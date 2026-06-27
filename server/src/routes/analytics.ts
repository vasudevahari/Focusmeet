import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { validateFocusLog } from "../middleware/validate";

const router = Router();

// GET /api/analytics/meeting/:meetingId
// Full meeting report for host
router.get("/meeting/:meetingId", async (req: Request, res: Response) => {
  try {
    const { meetingId } = req.params;

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        room: true,
        participants: {
          include: {
            focusLogs: {
              orderBy: { recordedAt: "asc" },
            },
          },
        },
        focusLogs: {
          orderBy: { recordedAt: "asc" },
        },
      },
    });

    if (!meeting) return res.status(404).json({ error: "Meeting not found" });

    const durationMs = meeting.endedAt
      ? meeting.endedAt.getTime() - meeting.startedAt.getTime()
      : Date.now() - meeting.startedAt.getTime();

    // Aggregate timeline: bucket focus logs into 30s intervals
    const bucketMs = 30_000;
    const buckets: Record<number, number[]> = {};
    for (const log of meeting.focusLogs) {
      const offset = log.recordedAt.getTime() - meeting.startedAt.getTime();
      const bucket = Math.floor(offset / bucketMs) * bucketMs;
      if (!buckets[bucket]) buckets[bucket] = [];
      buckets[bucket].push(log.score);
    }
    const groupTimeline = Object.entries(buckets)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([offsetMs, scores]) => ({
        offsetMs: Number(offsetMs),
        avgScore: Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length),
        label: formatOffset(Number(offsetMs)),
      }));

    // Per-participant analytics
    const participantReports = meeting.participants.map((p: any) => {
      const logs = p.focusLogs;
      const avgScore =
        logs.length > 0
          ? Math.round(logs.reduce((s: number, l: any) => s + l.score, 0) / logs.length)
          : 0;

      // Focused ticks = score >= 70, distracted = 40–69, unfocused = <40
      const TICK_S = 0.5; // each log = 500ms
      const focusedSecs = Math.round(logs.filter((l: any) => l.score >= 70).length * TICK_S);
      const distractedSecs = Math.round(logs.filter((l: any) => l.score >= 40 && l.score < 70).length * TICK_S);
      const unfocusedSecs = Math.round(logs.filter((l: any) => l.score < 40).length * TICK_S);

      const alertsByType: Record<string, number> = {};
      for (const log of logs) {
        if (log.eventType) {
          alertsByType[log.eventType] = (alertsByType[log.eventType] || 0) + 1;
        }
      }

      // Per-participant timeline
      const pBuckets: Record<number, number[]> = {};
      for (const log of logs) {
        const offset = log.recordedAt.getTime() - meeting.startedAt.getTime();
        const bucket = Math.floor(offset / bucketMs) * bucketMs;
        if (!pBuckets[bucket]) pBuckets[bucket] = [];
        pBuckets[bucket].push(log.score);
      }
      const timeline = Object.entries(pBuckets)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([offsetMs, scores]) => ({
          offsetMs: Number(offsetMs),
          avgScore: Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length),
          label: formatOffset(Number(offsetMs)),
        }));

      return {
        participantId: p.id,
        userId: p.userId,
        displayName: p.displayName,
        joinedAt: p.joinedAt,
        leftAt: p.leftAt,
        avgScore,
        focusedSecs,
        distractedSecs,
        unfocusedSecs,
        alertCount: p.alertCount,
        alertsByType,
        timeline,
      };
    });

    // Ranking by attentiveness (avg score desc)
    const ranked = [...participantReports].sort((a, b) => b.avgScore - a.avgScore);

    // Overall stats
    const allScores = meeting.focusLogs.map((l: any) => l.score);
    const overallAvg =
      allScores.length > 0
        ? Math.round(allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length)
        : 0;

    const totalAlerts = meeting.participants.reduce((s: number, p: any) => s + p.alertCount, 0);

    return res.json({
      meetingId: meeting.id,
      roomName: meeting.room.name,
      roomCode: meeting.room.roomCode,
      startedAt: meeting.startedAt,
      endedAt: meeting.endedAt,
      durationMs,
      participantCount: meeting.participants.length,
      overallAvgScore: overallAvg,
      totalAlerts,
      groupTimeline,
      participants: ranked,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// POST /api/analytics/focus-log  — batch ingest focus scores + events
router.post("/focus-log", validateFocusLog, async (req: Request, res: Response) => {
  try {
    const {
      meetingId,
      participantId,
      score,
      eventType,
    }: {
      meetingId: string;
      participantId: string;
      score: number;
      eventType?: string;
    } = req.body;

    if (!meetingId || !participantId || score == null) {
      return res.status(400).json({ error: "meetingId, participantId, score required" });
    }

    await prisma.focusLog.create({
      data: { meetingId, participantId, score, eventType: eventType ?? null },
    });

    // Update rolling avgFocusScore on participant
    const agg = await prisma.focusLog.aggregate({
      where: { participantId },
      _avg: { score: true },
      _count: true,
    });

    const focused = await prisma.focusLog.count({
      where: { participantId, score: { gte: 70 } },
    });
    const distracted = await prisma.focusLog.count({
      where: { participantId, score: { gte: 40, lt: 70 } },
    });

    const TICK_S = 0.5;
    await prisma.participant.update({
      where: { id: participantId },
      data: {
        avgFocusScore: agg._avg.score ?? 0,
        focusedSeconds: Math.round(focused * TICK_S),
        distractedSecs: Math.round(distracted * TICK_S),
        ...(eventType ? { alertCount: { increment: 1 } } : {}),
      },
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to log focus data" });
  }
});

// GET /api/analytics/room/:roomCode/history — list past meetings for a room
router.get("/room/:roomCode/history", async (req: Request, res: Response) => {
  try {
    const { roomCode } = req.params;
    const room = await prisma.room.findUnique({
      where: { roomCode },
      include: {
        meetings: {
          orderBy: { startedAt: "desc" },
          take: 20,
          include: {
            participants: true,
            focusLogs: { select: { score: true } },
          },
        },
      },
    });
    if (!room) return res.status(404).json({ error: "Room not found" });

    const meetings = room.meetings.map((m: any) => {
      const scores = m.focusLogs.map((l: any) => l.score);
      const avgScore =
        scores.length > 0
          ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
          : null;
      const durationMs = m.endedAt
        ? m.endedAt.getTime() - m.startedAt.getTime()
        : null;
      return {
        meetingId: m.id,
        startedAt: m.startedAt,
        endedAt: m.endedAt,
        durationMs,
        participantCount: m.participants.length,
        avgFocusScore: avgScore,
      };
    });

    return res.json({ roomName: room.name, roomCode, meetings });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch history" });
  }
});

function formatOffset(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default router;
