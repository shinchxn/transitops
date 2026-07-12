// File: backend/src/modules/maintenance/maintenance.routes.ts
import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../middleware/asyncHandler";
import { CreateMaintenanceSchema, MaintenanceQuerySchema } from "./maintenance.schema";
import * as controller from "./maintenance.controller";

const router = Router();

router.get("/", requireAuth, validate({ query: MaintenanceQuerySchema }), asyncHandler(controller.list));
router.post("/", requireAuth, requireRole("FLEET_MANAGER"), validate({ body: CreateMaintenanceSchema }), asyncHandler(controller.create));
router.patch("/:id/close", requireAuth, requireRole("FLEET_MANAGER"), asyncHandler(controller.close));

export default router;
