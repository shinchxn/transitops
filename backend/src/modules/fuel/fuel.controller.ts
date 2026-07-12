// File: backend/src/modules/fuel/fuel.controller.ts
import type { Request, Response } from "express";
import * as service from "./fuel.service";
import type { CreateFuelLogInput, CreateExpenseInput, FuelQuery } from "./fuel.schema";

export async function listFuelLogs(req: Request, res: Response): Promise<void> {
  res.json(await service.listFuelLogs(req.query as unknown as FuelQuery));
}

export async function createFuelLog(req: Request, res: Response): Promise<void> {
  const log = await service.createFuelLog(req.body as CreateFuelLogInput);
  res.status(201).json(log);
}

export async function listExpenses(req: Request, res: Response): Promise<void> {
  res.json(await service.listExpenses(req.query as unknown as FuelQuery));
}

export async function createExpense(req: Request, res: Response): Promise<void> {
  const expense = await service.createExpense(req.body as CreateExpenseInput);
  res.status(201).json(expense);
}
