// File: backend/src/lib/socket.ts
// Socket.IO server singleton and typed event emitter helpers.
// Agent A owns this file; this stub compiles so Agent C can import SOCKET_EVENTS.

import type { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";

// ─── Event name registry ─────────────────────────────────────────────────────
// All agents import from here — never hardcode event strings elsewhere.
export const SOCKET_EVENTS = {
  // Trip lifecycle (Agent C emits, Agent A/D listens)
  TRIP_CREATED: "trip:created",
  TRIP_DISPATCHED: "trip:dispatched",
  TRIP_COMPLETED: "trip:completed",
  TRIP_CANCELLED: "trip:cancelled",

  // Vehicle/Driver status changes (Agent B emits)
  VEHICLE_UPDATED: "vehicle:updated",
  DRIVER_UPDATED: "driver:updated",

  // Maintenance (Agent D emits)
  MAINTENANCE_OPENED: "maintenance:opened",
  MAINTENANCE_CLOSED: "maintenance:closed",
} as const;

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

// ─── Singleton ────────────────────────────────────────────────────────────────

let _io: SocketIOServer | null = null;

/**
 * Called once during server startup by Agent A's app bootstrap.
 * All modules then call getIO() to access the already-initialised instance.
 */
export function initSocket(httpServer: HttpServer, corsOrigin: string): SocketIOServer {
  _io = new SocketIOServer(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
  });
  return _io;
}

/**
 * Returns the initialised Socket.IO server.
 * Throws if called before initSocket() — intentionally loud so Agent A's
 * bootstrap order is enforced at runtime, not just by convention.
 */
export function getIO(): SocketIOServer {
  if (!_io) {
    throw new Error(
      "Socket.IO has not been initialised. Call initSocket() before getIO()."
    );
  }
  return _io;
}

/**
 * Convenience helper: emit a typed event with a standard envelope.
 * Always use this instead of calling io.emit() directly so every event
 * carries a consistent timestamp.
 */
export function emitEvent(event: SocketEventName, data: unknown): void {
  getIO().emit(event, {
    event,
    timestamp: new Date().toISOString(),
    data,
  });
}
