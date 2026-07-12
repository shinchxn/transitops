// File: backend/src/modules/drivers/drivers.service.ts
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/AppError";
import { emitEvent, SOCKET_EVENTS } from "../../lib/socket";
import type { CreateDriverInput, UpdateDriverInput, DriverQuery } from "./drivers.schema";

export async function listDrivers(query: DriverQuery) {
  const { status, search, expiringWithinDays, sort, page, limit } = query;

  const sortDesc = sort.startsWith("-");
  const sortField = sortDesc ? sort.slice(1) : sort;
  const orderBy = { [sortField]: sortDesc ? "desc" : "asc" } as Prisma.DriverOrderByWithRelationInput;

  const where: Prisma.DriverWhereInput = {
    ...(status !== undefined && { status }),
    ...(search !== undefined && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { licenseNumber: { contains: search, mode: "insensitive" } },
      ],
    }),
    ...(expiringWithinDays !== undefined && {
      licenseExpiryDate: {
        lte: new Date(Date.now() + expiringWithinDays * 24 * 60 * 60 * 1000),
      },
    }),
  };

  const [data, total] = await prisma.$transaction([
    prisma.driver.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit }),
    prisma.driver.count({ where }),
  ]);

  return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

export async function getDriverById(id: string) {
  const driver = await prisma.driver.findUnique({ where: { id } });
  if (!driver) throw new AppError(404, "NOT_FOUND", "Driver not found.");
  return driver;
}

export async function createDriver(input: CreateDriverInput) {
  try {
    return await prisma.driver.create({ data: { ...input, safetyScore: 100 } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new AppError(400, "DUPLICATE_VALUE", "License number already in use.", [
        { path: "licenseNumber", message: "Already in use." },
      ]);
    }
    throw err;
  }
}

export async function updateDriver(id: string, input: UpdateDriverInput) {
  try {
    const driver = await prisma.driver.update({ where: { id }, data: input });
    // Emit DRIVER_UPDATED so the dashboard and open tabs refresh live.
    // (Integration fix: Agent B's brief only specified VEHICLE_UPDATED;
    //  DRIVER_UPDATED was added here to mirror the vehicle pattern exactly.)
    emitEvent(SOCKET_EVENTS.DRIVER_UPDATED, { driver });
    return driver;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      throw new AppError(404, "NOT_FOUND", "Driver not found.");
    }
    throw err;
  }
}
