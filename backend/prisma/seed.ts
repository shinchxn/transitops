// File: backend/prisma/seed.ts
// Upserting by email (not create) makes the seed script idempotent —
// re-running it while iterating doesn't crash on a unique-constraint
// violation, which matters when 4 agents each run it locally.
// Run with: npm run seed
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SEED_ACCOUNTS: { email: string; password: string; name: string; role: Role }[] = [
  { email: "manager@transitops.dev", password: "Passw0rd!", name: "Fleet Manager", role: "FLEET_MANAGER" },
  { email: "driver@transitops.dev", password: "Passw0rd!", name: "Demo Driver", role: "DRIVER" },
  { email: "safety@transitops.dev", password: "Passw0rd!", name: "Safety Officer", role: "SAFETY_OFFICER" },
  { email: "analyst@transitops.dev", password: "Passw0rd!", name: "Financial Analyst", role: "FINANCIAL_ANALYST" },
];

async function main() {
  for (const account of SEED_ACCOUNTS) {
    const passwordHash = await bcrypt.hash(account.password, 10);
    await prisma.user.upsert({
      where: { email: account.email },
      update: { passwordHash, name: account.name, role: account.role },
      create: { email: account.email, passwordHash, name: account.name, role: account.role },
    });
    // Plaintext password printed only here, at seed time, for local dev login.
    console.log(`Seeded ${account.role}: ${account.email} / ${account.password}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
