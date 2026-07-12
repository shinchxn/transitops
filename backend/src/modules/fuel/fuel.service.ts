// File: backend/src/modules/fuel/fuel.service.ts
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/AppError";
import type { CreateFuelLogInput, CreateExpenseInput, FuelQuery } from "./fuel.schema";

export async function listFuelLogs(query: FuelQuery) {
  const { vehicleId, page, limit } = query;
  const where = { ...(vehicleId && { vehicleId }) };
  const [data, total] = await prisma.$transaction([
    prisma.fuelLog.findMany({ where, orderBy: { date: "desc" }, skip: (page - 1) * limit, take: limit }),
    prisma.fuelLog.count({ where }),
  ]);
  return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

export async function createFuelLog(input: CreateFuelLogInput) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: input.vehicleId } });
  if (!vehicle) throw new AppError(404, "NOT_FOUND", "Vehicle not found.");
  return prisma.fuelLog.create({
    data: {
      vehicleId: input.vehicleId,
      tripId: input.tripId ?? null,
      liters: input.liters,
      cost: input.cost,
      date: input.date ?? new Date(),
    },
  });
}

export async function createExpense(input: CreateExpenseInput) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: input.vehicleId } });
  if (!vehicle) throw new AppError(404, "NOT_FOUND", "Vehicle not found.");
  return prisma.expense.create({
    data: {
      vehicleId: input.vehicleId,
      type: input.type,
      amount: input.amount,
      date: input.date ?? new Date(),
      notes: input.notes ?? null,
    },
  });
}

export async function listExpenses(query: FuelQuery) {
  const { vehicleId, page, limit } = query;
  const where = { ...(vehicleId && { vehicleId }) };
  const [data, total] = await prisma.$transaction([
    prisma.expense.findMany({ where, orderBy: { date: "desc" }, skip: (page - 1) * limit, take: limit }),
    prisma.expense.count({ where }),
  ]);
  return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}
