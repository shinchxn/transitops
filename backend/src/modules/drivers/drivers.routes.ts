// File: backend/src/modules/drivers/drivers.routes.ts
import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../middleware/asyncHandler";
import { CreateDriverSchema, UpdateDriverSchema, DriverQuerySchema } from "./drivers.schema";
import * as controller from "./drivers.controller";

const router = Router();

router.get("/", requireAuth, validate({ query: DriverQuerySchema }), asyncHandler(controller.list));
router.get("/:id", requireAuth, asyncHandler(controller.getOne));
router.post("/", requireAuth, requireRole("FLEET_MANAGER"), validate({ body: CreateDriverSchema }), asyncHandler(controller.create));
router.patch("/:id", requireAuth, requireRole("FLEET_MANAGER", "SAFETY_OFFICER"), validate({ body: UpdateDriverSchema }), asyncHandler(controller.update));

export default router;
