// File: backend/src/lib/prisma.ts
// Singleton so every module reuses one connection pool instead of
// instantiating PrismaClient per-request, which exhausts DB connections
// under load — standard pattern for Node + Prisma with hot reload in dev.
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
