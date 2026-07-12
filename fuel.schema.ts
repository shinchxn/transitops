// backend/src/modules/fuel/fuel.schema.ts
import { z } from "zod";

export const CreateFuelLogSchema = z.object({
  vehicleId: z.string().uuid(),
  tripId: z.string().uuid().optional(),
  liters: z.coerce.number().positive(),
  cost: z.coerce.number().nonnegative(),
  date: z.coerce.date().optional(), // defaults to now in the service if omitted
});

export const CreateExpenseSchema = z.object({
  vehicleId: z.string().uuid(),
  type: z.enum(["TOLL", "MAINTENANCE", "OTHER"]),
  amount: z.coerce.number().nonnegative(),
  date: z.coerce.date().optional(),
  notes: z.string().max(300).optional(),
});

export type CreateFuelLogInput = z.infer<typeof CreateFuelLogSchema>;
export type CreateExpenseInput = z.infer<typeof CreateExpenseSchema>;
