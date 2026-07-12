// File: backend/src/modules/vehicles/vehicles.controller.ts

import { Request, Response } from "express";
import { vehicleService } from "./vehicles.service";
import { VehicleQuery } from "./vehicles.schema";

export const list = async (req: Request, res: Response) => {
  const result = await vehicleService.listVehicles(req.query as VehicleQuery);
  res.status(200).json(result);
};

export const create = async (req: Request, res: Response) => {
  const vehicle = await vehicleService.createVehicle(req.body);
  res.status(201).json(vehicle);
};

export const update = async (req: Request, res: Response) => {
  const vehicle = await vehicleService.updateVehicle(req.params.id, req.body);
  res.status(200).json(vehicle);
};
