// backend/src/modules/reports/reports.service.ts
import { prisma } from "../../lib/prisma";
import type { ReportRangeQuery } from "./reports.schema";

// Hackathon-demo proxy for real billing data — see the explicit
// assumption call-out in the PR description / team chat before demo day.
const REVENUE_PER_KM = Number(process.env.REVENUE_PER_KM_USD ?? 2.5);

function dateRangeWhere(field: string, query: Pick<ReportRangeQuery, "from" | "to">) {
  if (!query.from && !query.to) return {};
  return {
    [field]: {
      ...(query.from ? { gte: query.from } : {}),
      ...(query.to ? { lte: query.to } : {}),
    },
  };
}

// ---------------------------------------------------------------------
// Dashboard KPIs
// ---------------------------------------------------------------------
// Documented mapping (schema fields don't spell these out):
//   Active Trips      = Trip where status = DISPATCHED
//   Pending Trips     = Trip where status = DRAFT
//   Active Vehicles   = Vehicle where status != RETIRED
//   Drivers On Duty   = Driver where status IN (AVAILABLE, ON_TRIP)
//   Fleet Utilization = (vehicles ON_TRIP) / (vehicles != RETIRED) * 100
//
// Vehicle counts are computed with a single groupBy rather than several
// separate count() calls — one round trip to the DB instead of four.
export async function getDashboardKpis() {
  const vehicleGroups = await prisma.vehicle.groupBy({
    by: ["status"],
    _count: true,
  });

  const countByStatus = (status: string) =>
    vehicleGroups.find((g) => g.status === status)?._count ?? 0;

  const totalNonRetired = vehicleGroups
    .filter((g) => g.status !== "RETIRED")
    .reduce((sum, g) => sum + g._count, 0);

  const onTrip = countByStatus("ON_TRIP");
  const available = countByStatus("AVAILABLE");
  const inShop = countByStatus("IN_SHOP");

  const [activeTrips, pendingTrips, driversOnDuty] = await prisma.$transaction([
    prisma.trip.count({ where: { status: "DISPATCHED" } }),
    prisma.trip.count({ where: { status: "DRAFT" } }),
    prisma.driver.count({ where: { status: { in: ["AVAILABLE", "ON_TRIP"] } } }),
  ]);

  const fleetUtilizationPct = totalNonRetired === 0 ? 0 : (onTrip / totalNonRetired) * 100;

  return {
    activeVehicles: totalNonRetired,
    availableVehicles: available,
    vehiclesInMaintenance: inShop,
    activeTrips,
    pendingTrips,
    driversOnDuty,
    fleetUtilizationPct: Math.round(fleetUtilizationPct * 100) / 100,
  };
}

// ---------------------------------------------------------------------
// Fleet utilization report (no date range — current snapshot, same
// formula as the dashboard so the two never disagree)
// ---------------------------------------------------------------------
export async function getFleetUtilization() {
  const vehicleGroups = await prisma.vehicle.groupBy({
    by: ["status"],
    _count: true,
  });

  const totalNonRetired = vehicleGroups
    .filter((g) => g.status !== "RETIRED")
    .reduce((sum, g) => sum + g._count, 0);
  const onTrip = vehicleGroups.find((g) => g.status === "ON_TRIP")?._count ?? 0;

  return {
    byStatus: vehicleGroups.map((g) => ({ status: g.status, count: g._count })),
    fleetUtilizationPct:
      totalNonRetired === 0 ? 0 : Math.round((onTrip / totalNonRetired) * 10000) / 100,
  };
}

// ---------------------------------------------------------------------
// Operational cost per vehicle (fuel + maintenance)
// ---------------------------------------------------------------------
export async function getOperationalCostRows(query: ReportRangeQuery) {
  const vehicleWhere = query.vehicleId ? { vehicleId: query.vehicleId } : {};

  const fuelByVehicle = await prisma.fuelLog.groupBy({
    by: ["vehicleId"],
    _sum: { cost: true },
    where: { ...vehicleWhere, ...dateRangeWhere("date", query) },
  });

  const maintenanceByVehicle = await prisma.maintenanceLog.groupBy({
    by: ["vehicleId"],
    _sum: { cost: true },
    where: { ...vehicleWhere, ...dateRangeWhere("openedAt", query) },
  });

  const vehicleIds = Array.from(
    new Set([...fuelByVehicle.map((f) => f.vehicleId), ...maintenanceByVehicle.map((m) => m.vehicleId)])
  );

  const vehicles = await prisma.vehicle.findMany({
    where: { id: { in: vehicleIds } },
    select: { id: true, name: true, registrationNumber: true, acquisitionCost: true },
  });
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]));

  return vehicleIds.map((vehicleId) => {
    const fuelCost = fuelByVehicle.find((f) => f.vehicleId === vehicleId)?._sum.cost ?? 0;
    const maintenanceCost =
      maintenanceByVehicle.find((m) => m.vehicleId === vehicleId)?._sum.cost ?? 0;
    const vehicle = vehicleById.get(vehicleId);
    return {
      vehicleId,
      registrationNumber: vehicle?.registrationNumber ?? "",
      name: vehicle?.name ?? "",
      fuelCost,
      maintenanceCost,
      totalCost: fuelCost + maintenanceCost,
    };
  });
}

// ---------------------------------------------------------------------
// Fuel efficiency per vehicle (COMPLETED trips only)
// ---------------------------------------------------------------------
export async function getFuelEfficiencyRows(query: ReportRangeQuery) {
  const vehicleWhere = query.vehicleId ? { vehicleId: query.vehicleId } : {};

  const perVehicle = await prisma.trip.groupBy({
    by: ["vehicleId"],
    where: { status: "COMPLETED", ...vehicleWhere, ...dateRangeWhere("completedAt", query) },
    _sum: { actualDistanceKm: true, fuelConsumedLtr: true },
  });

  const vehicleIds = perVehicle.map((p) => p.vehicleId);
  const vehicles = await prisma.vehicle.findMany({
    where: { id: { in: vehicleIds } },
    select: { id: true, name: true, registrationNumber: true },
  });
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]));

  return perVehicle.map((p) => {
    const distanceKm = p._sum.actualDistanceKm ?? 0;
    const fuelConsumedLtr = p._sum.fuelConsumedLtr ?? 0;
    const vehicle = vehicleById.get(p.vehicleId);
    return {
      vehicleId: p.vehicleId,
      registrationNumber: vehicle?.registrationNumber ?? "",
      name: vehicle?.name ?? "",
      distanceKm,
      fuelConsumedLtr,
      // Guard against division by zero — return null, not NaN/Infinity.
      efficiencyKmPerLtr: fuelConsumedLtr === 0 ? null : distanceKm / fuelConsumedLtr,
    };
  });
}

// ---------------------------------------------------------------------
// Vehicle ROI
// ---------------------------------------------------------------------
// Assumption (disclosed, not silently invented): revenue is modeled as
// REVENUE_PER_KM (env var REVENUE_PER_KM_USD, default 2.5) x sum of
// actualDistanceKm over each vehicle's COMPLETED trips. This is a
// hackathon-demo proxy for real billing data — confirm with the team
// before the demo whether this number should change.
export async function getVehicleRoiRows(query: ReportRangeQuery) {
  const [costRows, efficiencyRows] = await Promise.all([
    getOperationalCostRows(query),
    getFuelEfficiencyRows(query),
  ]);

  const vehicleIds = Array.from(
    new Set([...costRows.map((r) => r.vehicleId), ...efficiencyRows.map((r) => r.vehicleId)])
  );

  const vehicles = await prisma.vehicle.findMany({
    where: { id: { in: vehicleIds } },
    select: { id: true, name: true, registrationNumber: true, acquisitionCost: true },
  });
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]));

  return vehicleIds.map((vehicleId) => {
    const cost = costRows.find((r) => r.vehicleId === vehicleId);
    const efficiency = efficiencyRows.find((r) => r.vehicleId === vehicleId);
    const vehicle = vehicleById.get(vehicleId);

    const fuelCost = cost?.fuelCost ?? 0;
    const maintenanceCost = cost?.maintenanceCost ?? 0;
    const distanceKm = efficiency?.distanceKm ?? 0;
    const revenue = REVENUE_PER_KM * distanceKm;
    const acquisitionCost = vehicle?.acquisitionCost ?? 0;

    return {
      vehicleId,
      registrationNumber: vehicle?.registrationNumber ?? "",
      name: vehicle?.name ?? "",
      revenue,
      fuelCost,
      maintenanceCost,
      acquisitionCost,
      // Guard against division by zero — return null, not a crash.
      roi:
        acquisitionCost === 0
          ? null
          : (revenue - (maintenanceCost + fuelCost)) / acquisitionCost,
    };
  });
}

// ---------------------------------------------------------------------
// CSV export dispatcher — routes a report name to its row-producing fn
// ---------------------------------------------------------------------
export async function getReportRows(report: string, query: ReportRangeQuery) {
  switch (report) {
    case "utilization": {
      const util = await getFleetUtilization();
      return util.byStatus.map((row) => ({
        status: row.status,
        count: row.count,
        fleetUtilizationPct: util.fleetUtilizationPct,
      }));
    }
    case "operational-cost":
      return getOperationalCostRows(query);
    case "fuel-efficiency":
      return getFuelEfficiencyRows(query);
    case "vehicle-roi":
      return getVehicleRoiRows(query);
    default:
      return [];
  }
}
