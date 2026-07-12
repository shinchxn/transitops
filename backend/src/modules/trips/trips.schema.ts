// File: backend/src/modules/trips/trips.schema.ts
// Zod schemas for the trips module.
// Validated at the route layer — controllers never receive unvalidated input.

import { z } from "zod";

export const CreateTripSchema = z.object({
  source: z.string().min(1).max(150),
  destination: z.string().min(1).max(150),
  cargoWeightKg: z.coerce.number().positive("Must be greater than 0."),
  plannedDistanceKm: z.coerce.number().positive("Must be greater than 0."),
  vehicleId: z.string().uuid(),
  driverId: z.string().uuid(),
});

export const CompleteTripSchema = z.object({
  actualDistanceKm: z.coerce.number().positive("Must be greater than 0."),
  fuelConsumedLtr: z.coerce.number().positive("Must be greater than 0."),
});

export const TripQuerySchema = z.object({
  status: z
    .enum(["DRAFT", "DISPATCHED", "COMPLETED", "CANCELLED"])
    .optional(),
  vehicleId: z.string().uuid().optional(),
  driverId: z.string().uuid().optional(),
  sort: z
    .enum(["createdAt", "-createdAt", "dispatchedAt", "-dispatchedAt"])
    .default("-createdAt"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateTripInput = z.infer<typeof CreateTripSchema>;
export type CompleteTripInput = z.infer<typeof CompleteTripSchema>;
export type TripQuery = z.infer<typeof TripQuerySchema>;
