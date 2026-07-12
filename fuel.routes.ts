// backend/src/modules/fuel/fuel.routes.ts
//
// IMPORTANT: per SOLUTION.md Section 7, these two routers mount on
// separate top-level paths — /api/fuel-logs and /api/expenses — NOT
// nested under a shared /fuel prefix, even though both files live in
// this one fuel/ module directory. Mount them like this in Agent A's
// main app/router file:
//
//   app.use("/api/fuel-logs", fuelLogsRouter);
//   app.use("/api/expenses", expensesRouter);
//
import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../lib/asyncHandler";
import { CreateFuelLogSchema, CreateExpenseSchema } from "./fuel.schema";
import { createFuelLogHandler, createExpenseHandler } from "./fuel.controller";

export const fuelLogsRouter = Router();
fuelLogsRouter.post(
  "/",
  requireAuth,
  requireRole("DRIVER", "FLEET_MANAGER"),
  validate({ body: CreateFuelLogSchema }),
  asyncHandler(createFuelLogHandler)
);

export const expensesRouter = Router();
expensesRouter.post(
  "/",
  requireAuth,
  requireRole("FLEET_MANAGER", "FINANCIAL_ANALYST"),
  validate({ body: CreateExpenseSchema }),
  asyncHandler(createExpenseHandler)
);
