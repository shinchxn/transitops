// File: backend/src/modules/maintenance/maintenance.controller.ts
import type { Request, Response } from "express";
import * as service from "./maintenance.service";
import type { CreateMaintenanceInput, MaintenanceQuery } from "./maintenance.schema";

export async function list(req: Request, res: Response): Promise<void> {
  res.json(await service.listMaintenance(req.query as unknown as MaintenanceQuery));
}

export async function create(req: Request, res: Response): Promise<void> {
  const result = await service.createMaintenance(req.body as CreateMaintenanceInput);
  res.status(201).json(result);
}

export async function close(req: Request, res: Response): Promise<void> {
  const result = await service.closeMaintenance(req.params["id"] as string);
  res.json(result);
}
