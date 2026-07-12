// File: backend/src/index.ts
// Entry point — Agent A (Phase 1) fills this out.
// Placeholder so `tsx watch src/index.ts` has a valid target.

import dotenv from "dotenv";
dotenv.config();

const PORT = process.env["PORT"] ?? 4000;

// TODO (Agent A): wire up Express app, CORS, cookie-parser, routes, Socket.IO
console.log(`TransitOps backend starting on port ${PORT} — scaffold only`);
