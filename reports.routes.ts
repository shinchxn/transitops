// backend/src/modules/reports/reports.routes.ts
import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../lib/asyncHandler";
import { ReportRangeQuerySchema, ExportQuerySchema } from "./reports.schema";
import {
  dashboardKpis,
  fleetUtilization,
  operationalCost,
  fuelEfficiency,
  vehicleRoi,
  exportCsv,
} from "./reports.controller";

const router = Router();

router.get("/dashboard-kpis", requireAuth, asyncHandler(dashboardKpis));
router.get("/fleet-utilization", requireAuth, asyncHandler(fleetUtilization));
router.get(
  "/operational-cost",
  requireAuth,
  requireRole("FINANCIAL_ANALYST", "FLEET_MANAGER"),
  validate({ query: ReportRangeQuerySchema }),
  asyncHandler(operationalCost)
);
router.get(
  "/fuel-efficiency",
  requireAuth,
  requireRole("FINANCIAL_ANALYST", "FLEET_MANAGER"),
  validate({ query: ReportRangeQuerySchema }),
  asyncHandler(fuelEfficiency)
);
router.get(
  "/vehicle-roi",
  requireAuth,
  requireRole("FINANCIAL_ANALYST"),
  validate({ query: ReportRangeQuerySchema }),
  asyncHandler(vehicleRoi)
);
router.get(
  "/export",
  requireAuth,
  validate({ query: ExportQuerySchema }),
  asyncHandler(exportCsv)
);

export default router;
