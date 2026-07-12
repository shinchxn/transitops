// File: backend/src/modules/maintenance/maintenance.schema.ts
import { z } from "zod";

export const CreateMaintenanceSchema = z.object({
  vehicleId: z.string().uuid(),
  description: z.string().min(1).max(500),
  cost: z.coerce.number().nonnegative().default(0),
});

export const MaintenanceQuerySchema = z.object({
  vehicleId: z.string().uuid().optional(),
  status: z.enum(["OPEN", "CLOSED"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateMaintenanceInput = z.infer<typeof CreateMaintenanceSchema>;
export type MaintenanceQuery = z.infer<typeof MaintenanceQuerySchema>;
