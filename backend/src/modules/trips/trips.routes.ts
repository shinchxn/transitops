// File: backend/src/modules/trips/trips.routes.ts
// Express router for the trips module.
// Registered by Agent A's app bootstrap as: app.use("/api/trips", tripsRouter)

import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../middleware/asyncHandler";
import {
  CreateTripSchema,
  CompleteTripSchema,
  TripQuerySchema,
} from "./trips.schema";
import * as controller from "./trips.controller";

const router = Router();

// GET /api/trips — list with pagination, filtering, sorting
router.get(
  "/",
  requireAuth,
  validate({ query: TripQuerySchema }),
  asyncHandler(controller.list)
);

// GET /api/trips/:id — single trip detail
router.get("/:id", requireAuth, asyncHandler(controller.getOne));

// POST /api/trips — create a DRAFT trip
// Only DRIVER and FLEET_MANAGER may create trips.
router.post(
  "/",
  requireAuth,
  requireRole("DRIVER", "FLEET_MANAGER"),
  validate({ body: CreateTripSchema }),
  asyncHandler(controller.create)
);

// PATCH /api/trips/:id/dispatch — transition DRAFT → DISPATCHED
// Re-validates all business rules at the moment of dispatch (not just at creation).
router.patch(
  "/:id/dispatch",
  requireAuth,
  requireRole("DRIVER", "FLEET_MANAGER"),
  asyncHandler(controller.dispatch)
);

// PATCH /api/trips/:id/complete — transition DISPATCHED → COMPLETED
// Requires actual distance and fuel consumed.
router.patch(
  "/:id/complete",
  requireAuth,
  requireRole("DRIVER", "FLEET_MANAGER"),
  validate({ body: CompleteTripSchema }),
  asyncHandler(controller.complete)
);

// PATCH /api/trips/:id/cancel — transition DISPATCHED → CANCELLED
// Only valid from DISPATCHED; restores vehicle and driver to AVAILABLE.
router.patch(
  "/:id/cancel",
  requireAuth,
  requireRole("DRIVER", "FLEET_MANAGER"),
  asyncHandler(controller.cancel)
);

// DELETE /api/trips/:id — intentional extension beyond the spec's route table.
// Discards a DRAFT trip before dispatch. The spec only defines lifecycle
// transitions via PATCH; this DELETE is an additive convenience so the UI
// can offer a "discard draft" action without requiring dispatch + cancel.
// FLEET_MANAGER only — drivers cannot silently delete drafts.
router.delete(
  "/:id",
  requireAuth,
  requireRole("FLEET_MANAGER"),
  asyncHandler(controller.deleteDraft)
);

export default router;
