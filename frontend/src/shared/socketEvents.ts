// File: frontend/src/shared/socketEvents.ts
// Mirrors backend/src/lib/socketEvents.ts exactly. Keep both files in
// sync by hand — a mismatch here silently breaks the live dashboard.
export const SOCKET_EVENTS = {
  VEHICLE_UPDATED: "vehicle:updated",
  DRIVER_UPDATED: "driver:updated",
  TRIP_CREATED: "trip:created",
  TRIP_DISPATCHED: "trip:dispatched",
  TRIP_COMPLETED: "trip:completed",
  TRIP_CANCELLED: "trip:cancelled",
  MAINTENANCE_OPENED: "maintenance:opened",
  MAINTENANCE_CLOSED: "maintenance:closed",
} as const;

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];
