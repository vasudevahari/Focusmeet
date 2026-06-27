import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { customAlphabet } from "nanoid";
import { validateCreateRoom, validateRoomCode, sanitizeStr } from "../middleware/validate";

const router = Router();
const nanoid = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);

// POST /api/rooms
router.post("/", validateCreateRoom, async (req: Request, res: Response) => {
  try {
    const { name, hostName } = req.body;
    const hostId = crypto.randomUUID();
    const roomCode = nanoid();

    const room = await prisma.room.create({
      data: { roomCode, name, hostId, hostName, isActive: true },
    });

    const meeting = await prisma.meeting.create({ data: { roomId: room.id } });

    return res.status(201).json({
      roomCode: room.roomCode,
      roomName: room.name,
      hostId,
      meetingId: meeting.id,
    });
  } catch (err) {
    console.error("[rooms] create:", err);
    return res.status(500).json({ error: "Failed to create room" });
  }
});

// GET /api/rooms/:roomCode
router.get("/:roomCode", validateRoomCode, async (req: Request, res: Response) => {
  try {
    const { roomCode } = req.params;
    const room = await prisma.room.findUnique({
      where: { roomCode },
      include: {
        meetings: {
          where: { endedAt: null },
          orderBy: { startedAt: "desc" },
          take: 1,
        },
      },
    });

    if (!room) return res.status(404).json({ error: "Room not found" });
    if (!room.isActive) return res.status(410).json({ error: "Room has ended" });

    const activeMeeting = room.meetings[0];
    return res.json({
      roomCode: room.roomCode,
      roomName: room.name,
      hostName: room.hostName,
      meetingId: activeMeeting?.id ?? null,
      isActive: room.isActive,
    });
  } catch (err) {
    console.error("[rooms] get:", err);
    return res.status(500).json({ error: "Failed to fetch room" });
  }
});

// DELETE /api/rooms/:roomCode
router.delete("/:roomCode", validateRoomCode, async (req: Request, res: Response) => {
  try {
    const { roomCode } = req.params;
    const hostId = sanitizeStr(req.body.hostId, 36);

    if (!hostId || !/^[0-9a-f-]{36}$/i.test(hostId)) {
      return res.status(400).json({ error: "Invalid hostId" });
    }

    const room = await prisma.room.findUnique({ where: { roomCode } });
    if (!room) return res.status(404).json({ error: "Room not found" });
    if (room.hostId !== hostId) return res.status(403).json({ error: "Forbidden" });

    await prisma.room.update({ where: { roomCode }, data: { isActive: false } });
    await prisma.meeting.updateMany({
      where: { roomId: room.id, endedAt: null },
      data: { endedAt: new Date() },
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("[rooms] delete:", err);
    return res.status(500).json({ error: "Failed to end room" });
  }
});

export default router;
