// File: frontend/src/shared/socketEvents.ts
// Single source of truth for Socket.IO event names, mirroring backend.
export const SOCKET_EVENTS = {
  TRIP_CREATED: "trip:created",
  TRIP_DISPATCHED: "trip:dispatched",
  TRIP_COMPLETED: "trip:completed",
  TRIP_CANCELLED: "trip:cancelled",
  VEHICLE_UPDATED: "vehicle:updated",
  DRIVER_UPDATED: "driver:updated",
  MAINTENANCE_OPENED: "maintenance:opened",
  MAINTENANCE_CLOSED: "maintenance:closed",
} as const;
