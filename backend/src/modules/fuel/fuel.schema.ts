// File: backend/src/modules/fuel/fuel.schema.ts
import { z } from "zod";

export const CreateFuelLogSchema = z.object({
  vehicleId: z.string().uuid(),
  tripId: z.string().uuid().optional(),
  liters: z.coerce.number().positive("Must be greater than 0."),
  cost: z.coerce.number().positive("Must be greater than 0."),
  date: z.coerce.date().optional(),
});

export const CreateExpenseSchema = z.object({
  vehicleId: z.string().uuid(),
  type: z.enum(["TOLL", "MAINTENANCE", "OTHER"]),
  amount: z.coerce.number().positive("Must be greater than 0."),
  date: z.coerce.date().optional(),
  notes: z.string().max(500).optional(),
});

export const FuelQuerySchema = z.object({
  vehicleId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateFuelLogInput = z.infer<typeof CreateFuelLogSchema>;
export type CreateExpenseInput = z.infer<typeof CreateExpenseSchema>;
export type FuelQuery = z.infer<typeof FuelQuerySchema>;
