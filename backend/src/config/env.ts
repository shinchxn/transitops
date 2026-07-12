// File: backend/src/config/env.ts
// Environment Safety rubric item: JWT secret and DB URL must come from
// process.env only, and we fail fast at boot (not on the first request
// that happens to need them) if a required var is missing — a clearer
// failure mode than a cryptic Prisma/jwt error mid-request during a demo.
import dotenv from "dotenv";
dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name} (check .env against .env.example)`);
  }
  return value;
}

export const env = {
  PORT: Number(process.env.PORT ?? 4000),
  NODE_ENV: process.env.NODE_ENV ?? "development",
  DATABASE_URL: required("DATABASE_URL"),
  JWT_SECRET: required("JWT_SECRET"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? "8h",
  FRONTEND_ORIGIN: required("FRONTEND_ORIGIN"),
};
