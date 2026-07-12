// File: backend/src/index.ts
// Server entry point.
// Agent A owns the full bootstrap; this file is extended here by Agent C
// to wire the trips router so the module runs in isolation for testing.

import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { initSocket } from "./lib/socket";
import { errorHandler } from "./middleware/errorHandler";
import tripsRouter from "./modules/trips/trips.routes";

const app = express();
const PORT = Number(process.env["PORT"] ?? 4000);
const FRONTEND_ORIGIN = process.env["FRONTEND_ORIGIN"] ?? "http://localhost:5173";

// ─── Global middleware ────────────────────────────────────────────────────────
app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// ─── Routes ───────────────────────────────────────────────────────────────────
// Agent A will register auth, vehicles, drivers, maintenance, fuel, reports here.
// Agent C registers trips:
app.use("/api/trips", tripsRouter);

// Health check — useful for load balancers and quick smoke tests.
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Error handler (must be last) ─────────────────────────────────────────────
app.use(errorHandler);

// ─── Start server ─────────────────────────────────────────────────────────────
const server = http.createServer(app);

// Initialise Socket.IO — must happen before any route emits events.
initSocket(server, FRONTEND_ORIGIN);

server.listen(PORT, () => {
  console.log(`TransitOps backend listening on http://localhost:${PORT}`);
});

export { app, server };
