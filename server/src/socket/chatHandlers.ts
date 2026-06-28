import { Server, Socket } from "socket.io";
import { prisma } from "../lib/prisma";

export function registerChatHandlers(io: Server, socket: Socket) {
  socket.on(
    "chat:message",
    async ({
      roomCode,
      userId,
      userName,
      content,
      meetingId,
      recipientId,
    }: {
      roomCode: string;
      userId: string;
      userName: string;
      content: string;
      meetingId: string;
      recipientId?: string;
    }) => {
      if (!content?.trim()) return;

      const message = {
        id: crypto.randomUUID(),
        userId,
        userName,
        content: content.trim(),
        recipientId: recipientId || undefined,
        sentAt: new Date().toISOString(),
      };

      // Persist
      try {
        await prisma.message.create({
          data: {
            id: message.id,
            meetingId,
            userId,
            userName,
            content: message.content,
            recipientId: recipientId || null,
          },
        });
      } catch (_) {}

      // Route message
      if (recipientId) {
        // Private message: send only to recipient + sender
        io.to(roomCode).emit("chat:message:private", message);
      } else {
        // Room message: broadcast to all in room
        io.to(roomCode).emit("chat:message", message);
      }
    }
  );
}
