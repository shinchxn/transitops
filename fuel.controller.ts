// backend/src/modules/fuel/fuel.controller.ts
import type { Request, Response } from "express";
import { createFuelLog, createExpense } from "./fuel.service";
import type { CreateFuelLogInput, CreateExpenseInput } from "./fuel.schema";

export async function createFuelLogHandler(req: Request, res: Response) {
  const input = req.body as CreateFuelLogInput;
  const log = await createFuelLog(input);
  res.status(201).json(log);
}

export async function createExpenseHandler(req: Request, res: Response) {
  const input = req.body as CreateExpenseInput;
  const expense = await createExpense(input);
  res.status(201).json(expense);
}
