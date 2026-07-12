// File: backend/src/index.ts
// Express app entry point — wires up middleware, routes, error handling, and Socket.IO.

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { setIO } from "./lib/socket";
import { AppError } from "./lib/AppError";
import vehicleRoutes from "./modules/vehicles/vehicles.routes";
import driverRoutes from "./modules/drivers/drivers.routes";

const PORT = process.env["PORT"] ?? 4000;
const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: process.env["FRONTEND_URL"] ?? "http://localhost:5173", credentials: true },
});

// Initialize socket.io globally
setIO(io);

// ─── Middleware ───────────────────────────────────────────────────────────────

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS & Cookies
app.use(
  cors({
    origin: process.env["FRONTEND_URL"] ?? "http://localhost:5173",
    credentials: true,
  })
);
app.use(cookieParser());

// Mock auth middleware — in production, this decodes JWT from cookies
// For now, assumes req.user is set by the frontend in a test setup
app.use((req, res, next) => {
  // Placeholder: real auth would verify JWT here and set req.user
  // For testing with curl, set a mock user via a header
  if (req.headers["x-user-id"]) {
    req.user = {
      id: req.headers["x-user-id"] as string,
      email: req.headers["x-user-email"] as string || "test@example.com",
      role: (req.headers["x-user-role"] as any) || "FLEET_MANAGER",
    };
  }
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/vehicles", vehicleRoutes);
app.use("/api/drivers", driverRoutes);

// ─── Error Handler ────────────────────────────────────────────────────────────

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  // Generic error handling
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred",
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`TransitOps backend running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  httpServer.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
