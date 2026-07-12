// File: backend/src/index.ts
// Server entry point.
// Integrates all 4 agents' modules together in a single API.

import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { initSocket } from "./lib/socket";
import { errorHandler } from "./middleware/errorHandler";

import authRouter from "./modules/auth/auth.routes";
import vehiclesRouter from "./modules/vehicles/vehicles.routes";
import driversRouter from "./modules/drivers/drivers.routes";
import tripsRouter from "./modules/trips/trips.routes";
import maintenanceRouter from "./modules/maintenance/maintenance.routes";
import fuelRouter from "./modules/fuel/fuel.routes";
import reportsRouter from "./modules/reports/reports.routes";

const app = express();
const PORT = Number(process.env["PORT"] ?? 4000);
const FRONTEND_ORIGIN = process.env["FRONTEND_ORIGIN"] ?? "http://localhost:5173";

// ─── Global middleware ────────────────────────────────────────────────────────
app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// ─── Routes (All Agents Integrated) ───────────────────────────────────────────
app.use("/api/auth", authRouter);                   // Agent A
app.use("/api/vehicles", vehiclesRouter);           // Agent B
app.use("/api/drivers", driversRouter);             // Agent B
app.use("/api/trips", tripsRouter);                 // Agent C
app.use("/api/maintenance", maintenanceRouter);     // Agent D
app.use("/api", fuelRouter); // registers /fuel-logs and /expenses // Agent D
app.use("/api/reports", reportsRouter);             // Agent D

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
