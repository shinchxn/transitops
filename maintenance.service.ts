// backend/src/modules/maintenance/maintenance.service.ts
//
// NOTE: adjust these four import paths to match Agent A's actual file
// names/locations — I've used the most common convention for this stack.
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { emitSocketEvent, SOCKET_EVENTS } from "../../lib/socket";
import type { CreateMaintenanceInput, MaintenanceQuery } from "./maintenance.schema";

export async function listMaintenance(query: MaintenanceQuery) {
  const { status, vehicleId, sort, page, limit } = query;

  const where = {
    ...(status ? { status } : {}),
    ...(vehicleId ? { vehicleId } : {}),
  };

  const orderBy = {
    openedAt: sort === "-openedAt" ? ("desc" as const) : ("asc" as const),
  };

  const [items, total] = await prisma.$transaction([
    prisma.maintenanceLog.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.maintenanceLog.count({ where }),
  ]);

  return { items, total, page, limit };
}

export async function openMaintenance(input: CreateMaintenanceInput) {
  const result = await prisma.$transaction(async (tx) => {
    const vehicle = await tx.vehicle.findUnique({ where: { id: input.vehicleId } });
    if (!vehicle) {
      throw new AppError(404, "VEHICLE_NOT_FOUND", "Vehicle not found.");
    }

    const existingOpen = await tx.maintenanceLog.findFirst({
      where: { vehicleId: input.vehicleId, status: "OPEN" },
    });
    if (existingOpen) {
      // Prevents two open logs racing to independently "close" the
      // vehicle's status later, which would corrupt the state machine.
      throw new AppError(
        400,
        "MAINTENANCE_ALREADY_OPEN",
        "This vehicle already has an open maintenance record."
      );
    }

    const log = await tx.maintenanceLog.create({
      data: {
        vehicleId: input.vehicleId,
        description: input.description,
        cost: input.cost,
        status: "OPEN",
        openedAt: new Date(),
      },
    });

    const updatedVehicle = await tx.vehicle.update({
      where: { id: input.vehicleId },
      data: { status: "IN_SHOP" },
    });

    return { log, updatedVehicle };
  });

  emitSocketEvent(SOCKET_EVENTS.MAINTENANCE_OPENED, result.log);
  emitSocketEvent(SOCKET_EVENTS.VEHICLE_UPDATED, result.updatedVehicle);

  return result.log;
}

export async function closeMaintenance(id: string) {
  const result = await prisma.$transaction(async (tx) => {
    const log = await tx.maintenanceLog.findUnique({ where: { id } });
    if (!log) {
      throw new AppError(404, "MAINTENANCE_NOT_FOUND", "Maintenance record not found.");
    }
    if (log.status !== "OPEN") {
      throw new AppError(
        400,
        "INVALID_MAINTENANCE_STATE",
        "This maintenance record is already closed."
      );
    }

    const closedLog = await tx.maintenanceLog.update({
      where: { id },
      data: { status: "CLOSED", closedAt: new Date() },
    });

    const vehicle = await tx.vehicle.findUnique({ where: { id: log.vehicleId } });
    let updatedVehicle = vehicle;

    // Section 8: a RETIRED vehicle stays RETIRED even after maintenance closes.
    if (vehicle && vehicle.status !== "RETIRED") {
      updatedVehicle = await tx.vehicle.update({
        where: { id: log.vehicleId },
        data: { status: "AVAILABLE" },
      });
    }

    return { closedLog, updatedVehicle };
  });

  emitSocketEvent(SOCKET_EVENTS.MAINTENANCE_CLOSED, result.closedLog);
  if (result.updatedVehicle) {
    emitSocketEvent(SOCKET_EVENTS.VEHICLE_UPDATED, result.updatedVehicle);
  }

  return result.closedLog;
}
