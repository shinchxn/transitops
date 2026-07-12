// File: backend/src/lib/socketEvents.ts
// Centralizing every event name as a typed constant means a typo in an
// emit() or on() call becomes a TypeScript error instead of a silent
// no-op — critical when the emitting module (Agent C) and the listening
// module (Agent D) are built by different people who never see each
// other's code until merge. This is as important a shared contract as
// schema.prisma — every event any agent will ever emit is defined here,
// even for events Agent A itself never fires.
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
