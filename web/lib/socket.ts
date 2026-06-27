import { io, Socket } from "socket.io-client";

// Create a fresh socket per page session — prevents stale event listeners
// on React StrictMode double-mount and navigation
let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket || socket.disconnected) {
    socket?.removeAllListeners();
    socket = io(process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000", {
      transports: ["websocket"],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });
  }
  return socket;
}

export function destroySocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
