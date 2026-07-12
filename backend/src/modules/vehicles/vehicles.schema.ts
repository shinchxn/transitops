// File: backend/src/modules/vehicles/vehicles.schema.ts

import { z } from "zod";

const VehicleStatusEnum = z.enum(["AVAILABLE", "ON_TRIP", "IN_SHOP", "RETIRED"]);

export const CreateVehicleSchema = z.object({
  registrationNumber: z.string().min(2).max(20),
  name: z.string().min(1).max(100),
  type: z.string().min(1).max(50),
  maxLoadCapacityKg: z.coerce.number().positive("Must be greater than 0."),
  acquisitionCost: z.coerce.number().nonnegative("Cannot be negative."),
  region: z.string().max(100).optional(),
  // status intentionally omitted — new vehicles always start AVAILABLE
});

export const UpdateVehicleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.string().min(1).max(50).optional(),
  maxLoadCapacityKg: z.coerce.number().positive().optional(),
  acquisitionCost: z.coerce.number().nonnegative().optional(),
  region: z.string().max(100).optional(),
  odometerKm: z.coerce.number().nonnegative().optional(),
  status: VehicleStatusEnum
    .refine((s) => s !== "ON_TRIP", {
      message: "ON_TRIP can only be set automatically by trip dispatch.",
    })
    .optional(),
}).strict(); // reject unknown keys outright rather than silently dropping them

export const VehicleQuerySchema = z.object({
  status: VehicleStatusEnum.optional(),
  type: z.string().optional(),
  region: z.string().optional(),
  search: z.string().optional(), // matches name OR registrationNumber, case-insensitive
  sort: z.enum(["name", "-name", "createdAt", "-createdAt", "odometerKm", "-odometerKm"])
    .default("-createdAt"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateVehicleInput = z.infer<typeof CreateVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof UpdateVehicleSchema>;
export type VehicleQuery = z.infer<typeof VehicleQuerySchema>;
