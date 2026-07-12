// File: backend/src/modules/vehicles/vehicles.routes.ts

import express from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth, requireRole } from "../../lib/auth";
import { validate } from "../../lib/validate";
import * as controller from "./vehicles.controller";
import {
  CreateVehicleSchema,
  UpdateVehicleSchema,
  VehicleQuerySchema,
} from "./vehicles.schema";

const router = express.Router();

router.get(
  "/",
  requireAuth,
  validate({ query: VehicleQuerySchema }),
  asyncHandler(controller.list)
);

router.post(
  "/",
  requireAuth,
  requireRole("FLEET_MANAGER"),
  validate({ body: CreateVehicleSchema }),
  asyncHandler(controller.create)
);

router.patch(
  "/:id",
  requireAuth,
  requireRole("FLEET_MANAGER"),
  validate({ body: UpdateVehicleSchema }),
  asyncHandler(controller.update)
);

export default router;
