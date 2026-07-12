// File: backend/src/modules/drivers/drivers.routes.ts

import express from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth, requireRole } from "../../lib/auth";
import { validate } from "../../lib/validate";
import * as controller from "./drivers.controller";
import {
  CreateDriverSchema,
  UpdateDriverSchema,
  DriverQuerySchema,
} from "./drivers.schema";

const router = express.Router();

router.get(
  "/",
  requireAuth,
  validate({ query: DriverQuerySchema }),
  asyncHandler(controller.list)
);

router.post(
  "/",
  requireAuth,
  requireRole("FLEET_MANAGER"),
  validate({ body: CreateDriverSchema }),
  asyncHandler(controller.create)
);

router.patch(
  "/:id",
  requireAuth,
  requireRole("FLEET_MANAGER", "SAFETY_OFFICER"),
  validate({ body: UpdateDriverSchema }),
  asyncHandler(controller.update)
);

export default router;
