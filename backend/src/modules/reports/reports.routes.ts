// File: backend/src/modules/reports/reports.routes.ts
import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/asyncHandler";
import * as controller from "./reports.controller";

const router = Router();

// Dashboard & Utilization
router.get("/dashboard-kpis", requireAuth, asyncHandler(controller.dashboardKpis));
router.get("/fleet-utilization", requireAuth, asyncHandler(controller.fleetUtilization));

// Financial & Operational (Financial Analyst / Fleet Manager only)
router.get("/operational-cost", requireAuth, requireRole("FINANCIAL_ANALYST", "FLEET_MANAGER"), asyncHandler(controller.operationalCost));
router.get("/fuel-efficiency", requireAuth, requireRole("FINANCIAL_ANALYST", "FLEET_MANAGER"), asyncHandler(controller.fuelEfficiency));
router.get("/vehicle-roi", requireAuth, requireRole("FINANCIAL_ANALYST", "FLEET_MANAGER"), asyncHandler(controller.vehicleRoi));

// Export
router.get("/export", requireAuth, requireRole("FINANCIAL_ANALYST", "FLEET_MANAGER"), asyncHandler(controller.exportCsv));

export default router;
