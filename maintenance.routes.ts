// backend/src/modules/maintenance/maintenance.routes.ts
import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../lib/asyncHandler";
import { CreateMaintenanceSchema, MaintenanceQuerySchema } from "./maintenance.schema";
import { list, open, close } from "./maintenance.controller";

const router = Router();

router.get("/", requireAuth, validate({ query: MaintenanceQuerySchema }), asyncHandler(list));
router.post(
  "/",
  requireAuth,
  requireRole("FLEET_MANAGER"),
  validate({ body: CreateMaintenanceSchema }),
  asyncHandler(open)
);
router.patch("/:id/close", requireAuth, requireRole("FLEET_MANAGER"), asyncHandler(close));

export default router;
