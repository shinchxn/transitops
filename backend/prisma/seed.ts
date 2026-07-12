// File: backend/prisma/seed.ts
import { PrismaClient, Role, VehicleStatus, DriverStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database with test users, vehicles, and drivers...");

  // Clear existing data to avoid constraint violations on run
  await prisma.trip.deleteMany({});
  await prisma.driver.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.vehicle.deleteMany({});

  const passwordHash = await bcrypt.hash("password123", 10);

  // 1. Create Users
  const managerUser = await prisma.user.create({
    data: {
      email: "manager@transitops.com",
      name: "Fleet Manager",
      passwordHash,
      role: Role.FLEET_MANAGER,
    },
  });

  const driverUser = await prisma.user.create({
    data: {
      email: "driver@transitops.com",
      name: "John Driver",
      passwordHash,
      role: Role.DRIVER,
    },
  });

  const driverUser2 = await prisma.user.create({
    data: {
      email: "driver2@transitops.com",
      name: "Jane Driver",
      passwordHash,
      role: Role.DRIVER,
    },
  });

  console.log("Users seeded successfully.");

  // 2. Create Vehicles
  const vehicle1 = await prisma.vehicle.create({
    data: {
      registrationNumber: "VAN-01",
      name: "Toyota HiAce 2021",
      type: "Van",
      maxLoadCapacityKg: 1200,
      acquisitionCost: 25000,
      status: VehicleStatus.AVAILABLE,
      region: "North",
    },
  });

  const vehicle2 = await prisma.vehicle.create({
    data: {
      registrationNumber: "TRUCK-02",
      name: "Isuzu Forward 2020",
      type: "Medium Truck",
      maxLoadCapacityKg: 5000,
      acquisitionCost: 45000,
      status: VehicleStatus.AVAILABLE,
      region: "South",
    },
  });

  console.log("Vehicles seeded successfully.");

  // 3. Create Drivers (associating them by name or metadata, noting schema has unique fields)
  // Let's create drivers
  const driver1 = await prisma.driver.create({
    data: {
      name: "John Driver",
      licenseNumber: "DL-987654321",
      licenseCategory: "Class B Heavy",
      licenseExpiryDate: new Date("2028-10-15T00:00:00Z"),
      contactNumber: "+15550199",
      safetyScore: 95.5,
      status: DriverStatus.AVAILABLE,
    },
  });

  const driver2 = await prisma.driver.create({
    data: {
      name: "Jane Driver",
      licenseNumber: "DL-123456789",
      licenseCategory: "Class B Light",
      licenseExpiryDate: new Date("2024-03-01T00:00:00Z"), // Expired to test expired driver validation!
      contactNumber: "+15550188",
      safetyScore: 98,
      status: DriverStatus.AVAILABLE,
    },
  });

  console.log("Drivers seeded successfully.");
  console.log(`Seeding complete. Use the following credentials to test:
  - Manager: manager@transitops.com / password123
  - Driver: driver@transitops.com / password123
  `);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
