// File: backend/src/lib/socket.ts
// Socket.IO server singleton. initSocket() is called once from index.ts
// after the HTTP server is created; every other module calls getIO() to
// emit, never constructs its own Server instance.
import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { SocketEventName } from "./socketEvents";

let io: SocketIOServer | undefined;

export function initSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: { origin: process.env.FRONTEND_ORIGIN, credentials: true },
  });
  return io;
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error("Socket.IO not initialized — call initSocket() first.");
  return io;
}

// Every event payload follows this envelope so the frontend has one
// parsing path regardless of which module emitted it.
export function emitEvent<T>(event: SocketEventName, data: T): void {
  getIO().emit(event, { event, timestamp: new Date().toISOString(), data });
}
