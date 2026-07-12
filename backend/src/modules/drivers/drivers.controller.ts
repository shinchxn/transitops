// File: backend/src/modules/drivers/drivers.controller.ts
import type { Request, Response } from "express";
import * as service from "./drivers.service";
import type { CreateDriverInput, UpdateDriverInput, DriverQuery } from "./drivers.schema";

export async function list(req: Request, res: Response): Promise<void> {
  const result = await service.listDrivers(req.query as unknown as DriverQuery);
  res.json(result);
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const driver = await service.getDriverById(req.params["id"] as string);
  res.json(driver);
}

export async function create(req: Request, res: Response): Promise<void> {
  const driver = await service.createDriver(req.body as CreateDriverInput);
  res.status(201).json(driver);
}

export async function update(req: Request, res: Response): Promise<void> {
  const driver = await service.updateDriver(
    req.params["id"] as string,
    req.body as UpdateDriverInput
  );
  res.json(driver);
}
