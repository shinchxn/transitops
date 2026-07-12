// File: backend/src/modules/drivers/drivers.schema.ts
import { z } from "zod";

const DriverStatusEnum = z.enum(["AVAILABLE", "ON_TRIP", "OFF_DUTY", "SUSPENDED"]);

export const CreateDriverSchema = z.object({
  name: z.string().min(1).max(100),
  licenseNumber: z.string().min(2).max(30),
  licenseCategory: z.string().min(1).max(20),
  licenseExpiryDate: z.coerce.date(),
  contactNumber: z.string().min(7).max(20),
  // safetyScore defaults to 100 in the DB; not settable on create
});

export const UpdateDriverSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    licenseCategory: z.string().min(1).max(20).optional(),
    licenseExpiryDate: z.coerce.date().optional(),
    contactNumber: z.string().min(7).max(20).optional(),
    safetyScore: z.coerce.number().min(0).max(100).optional(),
    status: DriverStatusEnum.refine((s) => s !== "ON_TRIP", {
      message: "ON_TRIP can only be set automatically by trip dispatch.",
    }).optional(),
  })
  .strict();

export const DriverQuerySchema = z.object({
  status: DriverStatusEnum.optional(),
  search: z.string().optional(),
  expiringWithinDays: z.coerce.number().int().positive().optional(),
  sort: z
    .enum([
      "name",
      "-name",
      "licenseExpiryDate",
      "-licenseExpiryDate",
      "safetyScore",
      "-safetyScore",
    ])
    .default("name"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateDriverInput = z.infer<typeof CreateDriverSchema>;
export type UpdateDriverInput = z.infer<typeof UpdateDriverSchema>;
export type DriverQuery = z.infer<typeof DriverQuerySchema>;
