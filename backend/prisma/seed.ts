// File: backend/prisma/seed.ts
// Seed script stub — Agent A fills in real seed data.
// Run with: npm run seed

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seed script — no seed data in Phase 0. Agent A adds data here.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
