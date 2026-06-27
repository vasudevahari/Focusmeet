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
    }: {
      roomCode: string;
      userId: string;
      userName: string;
      content: string;
      meetingId: string;
    }) => {
      if (!content?.trim()) return;

      const message = {
        id: crypto.randomUUID(),
        userId,
        userName,
        content: content.trim(),
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
          },
        });
      } catch (_) {}

      io.to(roomCode).emit("chat:message", message);
    }
  );
}
