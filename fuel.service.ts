// backend/src/modules/fuel/fuel.service.ts
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import type { CreateFuelLogInput, CreateExpenseInput } from "./fuel.schema";

export async function createFuelLog(input: CreateFuelLogInput) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: input.vehicleId } });
  if (!vehicle) {
    throw new AppError(404, "VEHICLE_NOT_FOUND", "Vehicle not found.");
  }

  if (input.tripId) {
    const trip = await prisma.trip.findUnique({ where: { id: input.tripId } });
    if (!trip) {
      throw new AppError(404, "TRIP_NOT_FOUND", "Trip not found.");
    }
    if (trip.vehicleId !== input.vehicleId) {
      // A fuel log pointing at a trip for a different vehicle would
      // silently corrupt the fuel-efficiency report.
      throw new AppError(
        400,
        "TRIP_VEHICLE_MISMATCH",
        "This trip is not associated with the selected vehicle."
      );
    }
  }

  return prisma.fuelLog.create({
    data: {
      vehicleId: input.vehicleId,
      tripId: input.tripId,
      liters: input.liters,
      cost: input.cost,
      date: input.date ?? new Date(),
    },
  });
}

export async function createExpense(input: CreateExpenseInput) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: input.vehicleId } });
  if (!vehicle) {
    throw new AppError(404, "VEHICLE_NOT_FOUND", "Vehicle not found.");
  }

  return prisma.expense.create({
    data: {
      vehicleId: input.vehicleId,
      type: input.type,
      amount: input.amount,
      date: input.date ?? new Date(),
      notes: input.notes,
    },
  });
}
