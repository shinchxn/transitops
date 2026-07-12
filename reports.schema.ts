// backend/src/modules/reports/reports.schema.ts
import { z } from "zod";

export const ReportRangeQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  vehicleId: z.string().uuid().optional(),
});

export const ExportQuerySchema = z
  .object({
    report: z.enum(["utilization", "operational-cost", "fuel-efficiency", "vehicle-roi"]),
    format: z.literal("csv"),
  })
  .merge(ReportRangeQuerySchema);

export type ReportRangeQuery = z.infer<typeof ReportRangeQuerySchema>;
export type ExportQuery = z.infer<typeof ExportQuerySchema>;
