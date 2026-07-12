// File: backend/src/modules/fuel/fuel.routes.ts
import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../middleware/asyncHandler";
import { CreateFuelLogSchema, CreateExpenseSchema, FuelQuerySchema } from "./fuel.schema";
import * as controller from "./fuel.controller";

const router = Router();

// Fuel logs
router.get("/fuel-logs", requireAuth, validate({ query: FuelQuerySchema }), asyncHandler(controller.listFuelLogs));
router.post("/fuel-logs", requireAuth, requireRole("DRIVER", "FLEET_MANAGER"), validate({ body: CreateFuelLogSchema }), asyncHandler(controller.createFuelLog));

// Expenses
router.get("/expenses", requireAuth, validate({ query: FuelQuerySchema }), asyncHandler(controller.listExpenses));
router.post("/expenses", requireAuth, requireRole("FLEET_MANAGER", "FINANCIAL_ANALYST"), validate({ body: CreateExpenseSchema }), asyncHandler(controller.createExpense));

export default router;
