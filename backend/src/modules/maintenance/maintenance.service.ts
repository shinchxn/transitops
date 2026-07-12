// File: backend/src/modules/maintenance/maintenance.service.ts
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/AppError";
import { emitEvent, SOCKET_EVENTS } from "../../lib/socket";
import type { CreateMaintenanceInput, MaintenanceQuery } from "./maintenance.schema";

export async function listMaintenance(query: MaintenanceQuery) {
  const { vehicleId, status, page, limit } = query;
  const where = {
    ...(vehicleId && { vehicleId }),
    ...(status && { status }),
  };
  const [data, total] = await prisma.$transaction([
    prisma.maintenanceLog.findMany({
      where,
      orderBy: { openedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.maintenanceLog.count({ where }),
  ]);
  return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

export async function createMaintenance(input: CreateMaintenanceInput) {
  // Verify vehicle exists
  const vehicle = await prisma.vehicle.findUnique({ where: { id: input.vehicleId } });
  if (!vehicle) throw new AppError(404, "NOT_FOUND", "Vehicle not found.");
  if (vehicle.status === "RETIRED") {
    throw new AppError(400, "VEHICLE_RETIRED", "Cannot open a maintenance record for a retired vehicle.");
  }

  // Atomically: create log + set vehicle to IN_SHOP
  const result = await prisma.$transaction(async (tx) => {
    const log = await tx.maintenanceLog.create({
      data: {
        vehicleId: input.vehicleId,
        description: input.description,
        cost: input.cost,
        status: "OPEN",
      },
    });
    const updatedVehicle = await tx.vehicle.update({
      where: { id: input.vehicleId },
      data: { status: "IN_SHOP" },
    });
    return { log, vehicle: updatedVehicle };
  });

  emitEvent(SOCKET_EVENTS.MAINTENANCE_OPENED, result);
  return result;
}

export async function closeMaintenance(id: string) {
  const log = await prisma.maintenanceLog.findUnique({ where: { id } });
  if (!log) throw new AppError(404, "NOT_FOUND", "Maintenance log not found.");
  if (log.status === "CLOSED") {
    throw new AppError(400, "ALREADY_CLOSED", "This maintenance record is already closed.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedLog = await tx.maintenanceLog.update({
      where: { id },
      data: { status: "CLOSED", closedAt: new Date() },
    });
    // Revert vehicle to AVAILABLE unless it is RETIRED — per business rule Section 8.
    const vehicle = await tx.vehicle.findUnique({ where: { id: log.vehicleId } });
    let updatedVehicle = vehicle;
    if (vehicle && vehicle.status !== "RETIRED") {
      updatedVehicle = await tx.vehicle.update({
        where: { id: log.vehicleId },
        data: { status: "AVAILABLE" },
      });
    }
    return { log: updatedLog, vehicle: updatedVehicle };
  });

  emitEvent(SOCKET_EVENTS.MAINTENANCE_CLOSED, result);
  return result;
}
