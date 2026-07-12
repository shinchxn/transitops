// File: backend/src/modules/reports/reports.controller.ts
import type { Request, Response } from "express";
import * as service from "./reports.service";

export async function dashboardKpis(_req: Request, res: Response): Promise<void> {
  res.json(await service.getDashboardKpis());
}

export async function fleetUtilization(_req: Request, res: Response): Promise<void> {
  res.json(await service.getFleetUtilization());
}

export async function operationalCost(_req: Request, res: Response): Promise<void> {
  res.json(await service.getOperationalCost());
}

export async function fuelEfficiency(_req: Request, res: Response): Promise<void> {
  res.json(await service.getFuelEfficiency());
}

export async function vehicleRoi(_req: Request, res: Response): Promise<void> {
  res.json(await service.getVehicleRoiFull());
}

export async function exportCsv(req: Request, res: Response): Promise<void> {
  const format = (req.query["format"] as string) ?? "csv";
  if (format !== "csv") {
    res.status(400).json({ error: "UNSUPPORTED_FORMAT", message: "Only format=csv is supported." });
    return;
  }

  // Export operational cost report as CSV by default.
  const data = await service.getOperationalCost();
  const csv = service.toCSV(data as unknown as Record<string, unknown>[]);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="transitops-operational-cost.csv"');
  res.send(csv);
}
