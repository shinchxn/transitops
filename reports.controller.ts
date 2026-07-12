// backend/src/modules/reports/reports.controller.ts
import type { Request, Response } from "express";
import {
  getDashboardKpis,
  getFleetUtilization,
  getOperationalCostRows,
  getFuelEfficiencyRows,
  getVehicleRoiRows,
  getReportRows,
} from "./reports.service";
import { toCsv } from "./csv";
import type { ReportRangeQuery, ExportQuery } from "./reports.schema";

export async function dashboardKpis(_req: Request, res: Response) {
  const result = await getDashboardKpis();
  res.status(200).json(result);
}

export async function fleetUtilization(_req: Request, res: Response) {
  const result = await getFleetUtilization();
  res.status(200).json(result);
}

export async function operationalCost(req: Request, res: Response) {
  const query = req.query as unknown as ReportRangeQuery;
  const rows = await getOperationalCostRows(query);
  res.status(200).json(rows);
}

export async function fuelEfficiency(req: Request, res: Response) {
  const query = req.query as unknown as ReportRangeQuery;
  const rows = await getFuelEfficiencyRows(query);
  res.status(200).json(rows);
}

export async function vehicleRoi(req: Request, res: Response) {
  const query = req.query as unknown as ReportRangeQuery;
  const rows = await getVehicleRoiRows(query);
  res.status(200).json(rows);
}

export async function exportCsv(req: Request, res: Response) {
  const { report, ...query } = req.query as unknown as ExportQuery;
  const rows = await getReportRows(report, query as ReportRangeQuery);
  const csv = toCsv(rows as Record<string, unknown>[]);

  const date = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${report}-${date}.csv"`);
  res.status(200).send(csv);
}
