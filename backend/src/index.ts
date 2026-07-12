// File: backend/src/index.ts
// Entry point. Agents B/C/D: import your router (e.g. `vehiclesRouter`)
// and mount it below with `app.use("/api/vehicles", vehiclesRouter)`,
// following the auth router's pattern. Do not add routes directly here —
// mount your module's own router.
import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";

import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { initSocket } from "./lib/socket";
import { authRouter } from "./modules/auth/auth.routes";

const app = express();

app.use(cors({ origin: env.FRONTEND_ORIGIN, credentials: true }));
app.use(cookieParser());
app.use(express.json());

app.get("/api/health", (req, res) => res.status(200).json({ ok: true }));

app.use("/api/auth", authRouter);

// Agents B/C/D mount their routers here, e.g.:
// app.use("/api/vehicles", vehiclesRouter);
// app.use("/api/drivers", driversRouter);
// app.use("/api/trips", tripsRouter);
// app.use("/api/maintenance", maintenanceRouter);
// app.use("/api/fuel-logs", fuelRouter);
// app.use("/api/expenses", expensesRouter);
// app.use("/api/reports", reportsRouter);

// Error handler must be the LAST app.use() — Express only treats a
// 4-arg middleware function as an error handler if it's registered last.
app.use(errorHandler);

const httpServer = http.createServer(app);
initSocket(httpServer);

httpServer.listen(env.PORT, () => {
  console.log(`TransitOps backend listening on http://localhost:${env.PORT}`);
});
