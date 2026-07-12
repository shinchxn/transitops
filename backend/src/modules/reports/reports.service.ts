// File: backend/src/modules/reports/reports.service.ts
// All report queries read from live data — no caches, no static numbers.
// Only COMPLETED trips contribute to efficiency/ROI (actualDistanceKm/fuelConsumedLtr
// are nullable; they are only non-null post-completion — never read from DRAFT/DISPATCHED).

import { prisma } from "../../lib/prisma";

// ─── Dashboard KPIs ───────────────────────────────────────────────────────────
// Definitions match SOLUTION.md Section 9 / Agent D brief exactly.
// activeVehicles = any vehicle that is NOT RETIRED (includes ON_TRIP, IN_SHOP, AVAILABLE).
// driversOnDuty  = drivers with status ON_TRIP.
export async function getDashboardKpis() {
  const [
    totalVehicles,
    availableVehicles,
    vehiclesOnTrip,
    vehiclesInMaintenance,
    retiredVehicles,
    activeTrips,       // status = DISPATCHED
    pendingTrips,      // status = DRAFT
    driversOnDuty,
    totalDrivers,
  ] = await prisma.$transaction([
    prisma.vehicle.count(),
    prisma.vehicle.count({ where: { status: "AVAILABLE" } }),
    prisma.vehicle.count({ where: { status: "ON_TRIP" } }),
    prisma.vehicle.count({ where: { status: "IN_SHOP" } }),
    prisma.vehicle.count({ where: { status: "RETIRED" } }),
    prisma.trip.count({ where: { status: "DISPATCHED" } }),
    prisma.trip.count({ where: { status: "DRAFT" } }),
    prisma.driver.count({ where: { status: "ON_TRIP" } }),
    prisma.driver.count(),
  ]);

  const activeVehicles = totalVehicles - retiredVehicles; // NOT RETIRED
  const fleetUtilizationPct =
    activeVehicles > 0
      ? Math.round((vehiclesOnTrip / activeVehicles) * 100 * 10) / 10
      : 0;

  return {
    activeVehicles,
    availableVehicles,
    vehiclesOnTrip,
    vehiclesInMaintenance,
    retiredVehicles,
    activeTrips,
    pendingTrips,
    driversOnDuty,
    totalDrivers,
    fleetUtilizationPct,
  };
}

// ─── Fleet Utilization ────────────────────────────────────────────────────────
// Returns the same formula as the dashboard KPI so the two never drift.
export async function getFleetUtilization() {
  const kpis = await getDashboardKpis();
  return {
    activeVehicles: kpis.activeVehicles,
    vehiclesOnTrip: kpis.vehiclesOnTrip,
    fleetUtilizationPct: kpis.fleetUtilizationPct,
  };
}

// ─── Operational Cost ─────────────────────────────────────────────────────────
// Per vehicle: fuel cost + maintenance cost = total operational cost.
export async function getOperationalCost() {
  const [vehicles, fuelLogs, maintenanceLogs] = await prisma.$transaction([
    prisma.vehicle.findMany({ orderBy: { name: "asc" } }),
    prisma.fuelLog.groupBy({ by: ["vehicleId"], _sum: { cost: true }, orderBy: { vehicleId: "asc" } }),
    prisma.maintenanceLog.groupBy({ by: ["vehicleId"], _sum: { cost: true }, orderBy: { vehicleId: "asc" } }),
  ]);

  const fuelByVehicle = new Map(fuelLogs.map((f) => [f.vehicleId, f._sum?.cost ?? 0]));
  const maintByVehicle = new Map(maintenanceLogs.map((m) => [m.vehicleId, m._sum?.cost ?? 0]));

  return vehicles.map((v) => {
    const fuelCost = fuelByVehicle.get(v.id) ?? 0;
    const maintenanceCost = maintByVehicle.get(v.id) ?? 0;
    return {
      vehicleId: v.id,
      registrationNumber: v.registrationNumber,
      name: v.name,
      fuelCost,
      maintenanceCost,
      totalOperationalCost: fuelCost + maintenanceCost,
    };
  });
}

// ─── Fuel Efficiency ─────────────────────────────────────────────────────────
// Efficiency = totalActualDistanceKm / totalFuelConsumedLtr (km/L).
// ONLY reads COMPLETED trips — actualDistanceKm and fuelConsumedLtr are only
// non-null post-completion, so querying DRAFT/DISPATCHED would divide by null.
export async function getFuelEfficiency() {
  const trips = await prisma.trip.findMany({
    where: {
      status: "COMPLETED",
      actualDistanceKm: { not: null },
      fuelConsumedLtr: { not: null },
    },
    select: {
      vehicleId: true,
      actualDistanceKm: true,
      fuelConsumedLtr: true,
    },
  });

  const vehicles = await prisma.vehicle.findMany({ select: { id: true, name: true, registrationNumber: true } });
  const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));

  // Aggregate per vehicle
  const byVehicle = new Map<string, { distanceKm: number; fuelLtr: number }>();
  for (const t of trips) {
    const existing = byVehicle.get(t.vehicleId) ?? { distanceKm: 0, fuelLtr: 0 };
    byVehicle.set(t.vehicleId, {
      distanceKm: existing.distanceKm + (t.actualDistanceKm ?? 0),
      fuelLtr: existing.fuelLtr + (t.fuelConsumedLtr ?? 0),
    });
  }

  return Array.from(byVehicle.entries()).map(([vehicleId, agg]) => {
    const v = vehicleMap.get(vehicleId);
    return {
      vehicleId,
      registrationNumber: v?.registrationNumber ?? "—",
      name: v?.name ?? "—",
      totalDistanceKm: agg.distanceKm,
      totalFuelLtr: agg.fuelLtr,
      efficiencyKmPerLtr: agg.fuelLtr > 0 ? Math.round((agg.distanceKm / agg.fuelLtr) * 100) / 100 : null,
    };
  });
}

// ─── Vehicle ROI ─────────────────────────────────────────────────────────────
// ROI = (revenue - (maintenanceCost + fuelCost)) / acquisitionCost
// Revenue is approximated as: completedTrips × some notional rate.
// Since the schema has no revenue field, revenue = 0 and ROI shows cost burden.
// This is flagged as a known limitation — a revenue field would need a schema change.
export async function getVehicleRoi() {
  const operationalCosts = await getOperationalCost();

  return operationalCosts.map((v) => {
    const vehicle = v; // already has acquisitionCost? No — need to join
    return {
      vehicleId: v.vehicleId,
      registrationNumber: v.registrationNumber,
      name: v.name,
      totalOperationalCost: v.totalOperationalCost,
      // Revenue not tracked in schema — ROI denominator only for cost visibility.
      roi: null as null, // requires revenue field (schema change needed)
    };
  });
}

// Full ROI with acquisition cost
export async function getVehicleRoiFull() {
  const [vehicles, fuelLogs, maintenanceLogs] = await prisma.$transaction([
    prisma.vehicle.findMany(),
    prisma.fuelLog.groupBy({ by: ["vehicleId"], _sum: { cost: true }, orderBy: { vehicleId: "asc" } }),
    prisma.maintenanceLog.groupBy({ by: ["vehicleId"], _sum: { cost: true }, orderBy: { vehicleId: "asc" } }),
  ]);

  const fuelByVehicle = new Map(fuelLogs.map((f) => [f.vehicleId, f._sum?.cost ?? 0]));
  const maintByVehicle = new Map(maintenanceLogs.map((m) => [m.vehicleId, m._sum?.cost ?? 0]));

  return vehicles.map((v) => {
    const fuelCost = fuelByVehicle.get(v.id) ?? 0;
    const maintenanceCost = maintByVehicle.get(v.id) ?? 0;
    const totalCost = fuelCost + maintenanceCost;
    // Revenue = 0 (not tracked in schema). ROI shown as cost-to-acquisition ratio.
    const costToAcquisitionRatio =
      v.acquisitionCost > 0 ? Math.round((totalCost / v.acquisitionCost) * 1000) / 1000 : null;
    return {
      vehicleId: v.id,
      registrationNumber: v.registrationNumber,
      name: v.name,
      acquisitionCost: v.acquisitionCost,
      fuelCost,
      maintenanceCost,
      totalOperationalCost: totalCost,
      // costToAcquisitionRatio = totalCost / acquisitionCost
      // Full ROI formula requires revenue field not in current schema.
      costToAcquisitionRatio,
    };
  });
}

// ─── CSV Export ───────────────────────────────────────────────────────────────
// Converts an array of objects to CSV string — no external library needed.
export function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]!);
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const val = r[h] ?? "";
          const str = String(val);
          // Quote strings containing commas, quotes, or newlines.
          return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(",")
    ),
  ];
  return lines.join("\n");
}
