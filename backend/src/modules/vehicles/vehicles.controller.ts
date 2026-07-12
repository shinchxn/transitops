// File: backend/src/modules/vehicles/vehicles.controller.ts
import type { Request, Response } from "express";
import * as service from "./vehicles.service";
import type { CreateVehicleInput, UpdateVehicleInput, VehicleQuery } from "./vehicles.schema";

export async function list(req: Request, res: Response): Promise<void> {
  const result = await service.listVehicles(req.query as unknown as VehicleQuery);
  res.json(result);
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const vehicle = await service.getVehicleById(req.params["id"] as string);
  res.json(vehicle);
}

export async function create(req: Request, res: Response): Promise<void> {
  const vehicle = await service.createVehicle(req.body as CreateVehicleInput);
  res.status(201).json(vehicle);
}

export async function update(req: Request, res: Response): Promise<void> {
  const vehicle = await service.updateVehicle(
    req.params["id"] as string,
    req.body as UpdateVehicleInput
  );
  res.json(vehicle);
}
