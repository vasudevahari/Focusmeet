import { Server } from "socket.io";
import { registerRoomHandlers } from "./roomHandlers";
import { registerChatHandlers } from "./chatHandlers";

export function initSocket(io: Server) {
  io.on("connection", (socket) => {
    console.log(`[socket] connected: ${socket.id}`);
    registerRoomHandlers(io, socket);
    registerChatHandlers(io, socket);
  });
}
