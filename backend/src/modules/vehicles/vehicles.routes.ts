// File: backend/src/modules/vehicles/vehicles.routes.ts
import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../middleware/asyncHandler";
import { CreateVehicleSchema, UpdateVehicleSchema, VehicleQuerySchema } from "./vehicles.schema";
import * as controller from "./vehicles.controller";

const router = Router();

router.get("/", requireAuth, validate({ query: VehicleQuerySchema }), asyncHandler(controller.list));
router.get("/:id", requireAuth, asyncHandler(controller.getOne));
router.post("/", requireAuth, requireRole("FLEET_MANAGER"), validate({ body: CreateVehicleSchema }), asyncHandler(controller.create));
router.patch("/:id", requireAuth, requireRole("FLEET_MANAGER"), validate({ body: UpdateVehicleSchema }), asyncHandler(controller.update));

export default router;
