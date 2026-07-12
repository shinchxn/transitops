// backend/src/modules/maintenance/maintenance.controller.ts
import type { Request, Response } from "express";
import { listMaintenance, openMaintenance, closeMaintenance } from "./maintenance.service";
import type { CreateMaintenanceInput, MaintenanceQuery } from "./maintenance.schema";

export async function list(req: Request, res: Response) {
  const query = req.query as unknown as MaintenanceQuery;
  const result = await listMaintenance(query);
  res.status(200).json(result);
}

export async function open(req: Request, res: Response) {
  const input = req.body as CreateMaintenanceInput;
  const log = await openMaintenance(input);
  res.status(201).json(log);
}

export async function close(req: Request, res: Response) {
  const { id } = req.params;
  const log = await closeMaintenance(id);
  res.status(200).json(log);
}
