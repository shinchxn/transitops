// File: backend/src/modules/drivers/drivers.controller.ts

import { Request, Response } from "express";
import { driverService } from "./drivers.service";
import { DriverQuery } from "./drivers.schema";

export const list = async (req: Request, res: Response) => {
  const result = await driverService.listDrivers(req.query as DriverQuery);
  res.status(200).json(result);
};

export const create = async (req: Request, res: Response) => {
  const driver = await driverService.createDriver(req.body);
  res.status(201).json(driver);
};

export const update = async (req: Request, res: Response) => {
  const driver = await driverService.updateDriver(req.params.id, req.body);
  res.status(200).json(driver);
};
