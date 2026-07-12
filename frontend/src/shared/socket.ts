// File: frontend/src/shared/socket.ts
// Socket.IO client — subscribes to real-time events from the backend.

import { io } from "socket.io-client";

const SOCKET_URL = (import.meta.env as any).VITE_SOCKET_URL || "http://localhost:4000";

export const socket = io(SOCKET_URL, {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
});

export const SOCKET_EVENTS = {
  VEHICLE_UPDATED: "vehicle:updated",
  DRIVER_UPDATED: "driver:updated",
  TRIP_DISPATCHED: "trip:dispatched",
  TRIP_COMPLETED: "trip:completed",
} as const;

socket.on("connect", () => {
  console.log("Socket connected:", socket.id);
});

socket.on("disconnect", () => {
  console.log("Socket disconnected");
});
