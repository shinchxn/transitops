// File: frontend/src/shared/socket.ts
// Single Socket.IO client instance — Agents B/C/D import this rather than
// creating their own connection. Connects directly to the backend origin
// (not through the Vite "/api" proxy, since Socket.IO uses its own
// "/socket.io" path that the proxy config doesn't cover).
import { io, Socket } from "socket.io-client";

const API_ORIGIN = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export const socket: Socket = io(API_ORIGIN, {
  withCredentials: true,
  autoConnect: true,
});
