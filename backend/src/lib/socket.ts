// File: backend/src/lib/socket.ts
// Socket.IO event definitions.

export const SOCKET_EVENTS = {
  VEHICLE_UPDATED: "vehicle:updated",
  DRIVER_UPDATED: "driver:updated",
  TRIP_DISPATCHED: "trip:dispatched",
  TRIP_COMPLETED: "trip:completed",
} as const;

// Socket.IO instance will be initialized in the Express app and passed via middleware.
// For now, we export a placeholder that modules can use to emit events.
let ioInstance: any = null;

export const setIO = (io: any) => {
  ioInstance = io;
};

export const getIO = () => ioInstance;

export const emitEvent = (event: string, data: any) => {
  const io = getIO();
  if (io) {
    io.emit(event, data);
  }
};
