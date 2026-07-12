// File: backend/src/modules/trips/trips.controller.ts
// Thin controllers — parse typed inputs from validated req, call the service,
// and shape the HTTP response. No business logic lives here.

import type { Request, Response } from "express";
import * as service from "./trips.service";
import type { CreateTripInput, CompleteTripInput, TripQuery } from "./trips.schema";

export async function list(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as TripQuery;
  const result = await service.listTrips(query);
  res.json(result);
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const trip = await service.getTripById(req.params["id"] as string);
  res.json(trip);
}

export async function create(req: Request, res: Response): Promise<void> {
  const input = req.body as CreateTripInput;
  const userId = req.user!.id; // requireAuth guarantees req.user is set
  const trip = await service.createTrip(input, userId);
  res.status(201).json(trip);
}

export async function dispatch(req: Request, res: Response): Promise<void> {
  const result = await service.dispatchTrip(req.params["id"] as string);
  res.json(result);
}

export async function complete(req: Request, res: Response): Promise<void> {
  const input = req.body as CompleteTripInput;
  const result = await service.completeTrip(req.params["id"] as string, input);
  res.json(result);
}

export async function cancel(req: Request, res: Response): Promise<void> {
  const result = await service.cancelTrip(req.params["id"] as string);
  res.json(result);
}

export async function deleteDraft(req: Request, res: Response): Promise<void> {
  const result = await service.deleteDraftTrip(req.params["id"] as string);
  res.json(result);
}
