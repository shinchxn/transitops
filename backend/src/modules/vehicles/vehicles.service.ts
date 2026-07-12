// File: backend/src/modules/vehicles/vehicles.service.ts
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/AppError";
import { emitEvent, SOCKET_EVENTS } from "../../lib/socket";
import type { CreateVehicleInput, UpdateVehicleInput, VehicleQuery } from "./vehicles.schema";

export async function listVehicles(query: VehicleQuery) {
  const { status, type, region, search, sort, page, limit } = query;

  const sortDesc = sort.startsWith("-");
  const sortField = sortDesc ? sort.slice(1) : sort;
  const orderBy = { [sortField]: sortDesc ? "desc" : "asc" } as Prisma.VehicleOrderByWithRelationInput;

  const where: Prisma.VehicleWhereInput = {
    ...(status !== undefined && { status }),
    ...(type !== undefined && { type: { contains: type, mode: "insensitive" } }),
    ...(region !== undefined && { region: { contains: region, mode: "insensitive" } }),
    ...(search !== undefined && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { registrationNumber: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  // Single round-trip: findMany + count in the same transaction.
  const [data, total] = await prisma.$transaction([
    prisma.vehicle.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.vehicle.count({ where }),
  ]);

  return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

export async function getVehicleById(id: string) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle) throw new AppError(404, "NOT_FOUND", "Vehicle not found.");
  return vehicle;
}

export async function createVehicle(input: CreateVehicleInput) {
  try {
    return await prisma.vehicle.create({
      data: { ...input, status: "AVAILABLE" },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new AppError(400, "DUPLICATE_VALUE", "Registration number already in use.", [
        { path: "registrationNumber", message: "Already in use." },
      ]);
    }
    throw err;
  }
}

export async function updateVehicle(id: string, input: UpdateVehicleInput) {
  try {
    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: input,
    });
    // Emit after successful write so the dashboard and other tabs refresh without polling.
    emitEvent(SOCKET_EVENTS.VEHICLE_UPDATED, { vehicle });
    return vehicle;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      throw new AppError(404, "NOT_FOUND", "Vehicle not found.");
    }
    throw err;
  }
}
