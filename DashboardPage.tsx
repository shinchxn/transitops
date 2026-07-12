// frontend/src/pages/DashboardPage.tsx
import { useEffect, useState, useCallback, useRef } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { apiClient } from "../shared/apiClient";
import { socket } from "../shared/socket";

interface DashboardKpis {
  activeVehicles: number;
  availableVehicles: number;
  vehiclesInMaintenance: number;
  activeTrips: number;
  pendingTrips: number;
  driversOnDuty: number;
  fleetUtilizationPct: number;
}

interface CostRow {
  vehicleId: string;
  registrationNumber: string;
  fuelCost: number;
  maintenanceCost: number;
  totalCost: number;
}

const SOCKET_EVENTS_TO_WATCH = [
  "TRIP_DISPATCHED",
  "TRIP_COMPLETED",
  "TRIP_CANCELLED",
  "MAINTENANCE_OPENED",
  "MAINTENANCE_CLOSED",
  "VEHICLE_UPDATED",
];

function KpiCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number | string;
  suffix?: string;
}) {
  return (
    <div className="border rounded-lg p-4 bg-white dark:bg-gray-900">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-2xl font-semibold mt-1">
        {value}
        {suffix ?? ""}
      </p>
    </div>
  );
}

// Re-fetches dashboard-kpis on any fleet-affecting event rather than
// hand-patching individual numbers from event payloads — several KPIs
// (e.g. fleetUtilizationPct) depend on aggregate counts the payload
// doesn't carry, so a full re-fetch is the simplest correct approach.
function useDashboardSocket(onUpdate: () => void) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const handler = () => onUpdateRef.current();
    for (const event of SOCKET_EVENTS_TO_WATCH) {
      socket.on(event, handler);
    }
    return () => {
      for (const event of SOCKET_EVENTS_TO_WATCH) {
        socket.off(event, handler);
      }
    };
  }, []);
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [costRows, setCostRows] = useState<CostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadKpis = useCallback(async () => {
    try {
      const res = await apiClient.get("/reports/dashboard-kpis");
      setKpis(res.data);
    } catch {
      setError("Couldn't load dashboard KPIs.");
    }
  }, []);

  const loadCostBreakdown = useCallback(async () => {
    try {
      const res = await apiClient.get("/reports/operational-cost");
      setCostRows(res.data);
    } catch {
      // Cost breakdown is FINANCIAL_ANALYST/FLEET_MANAGER-only server-side;
      // a 403 here just means this user's role can't see it — hide the chart.
      setCostRows([]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadKpis(), loadCostBreakdown()]);
      setLoading(false);
    })();
  }, [loadKpis, loadCostBreakdown]);

  // Priority: KPI cards updating live is the strongest demo moment —
  // wired first, ahead of any chart polish.
  useDashboardSocket(() => {
    loadKpis();
    loadCostBreakdown();
  });

  if (loading) {
    return <div className="p-6 text-gray-500">Loading dashboard…</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold">Fleet Dashboard</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <KpiCard label="Active Vehicles" value={kpis.activeVehicles} />
          <KpiCard label="Available Vehicles" value={kpis.availableVehicles} />
          <KpiCard label="Vehicles in Maintenance" value={kpis.vehiclesInMaintenance} />
          <KpiCard label="Active Trips" value={kpis.activeTrips} />
          <KpiCard label="Pending Trips" value={kpis.pendingTrips} />
          <KpiCard label="Drivers On Duty" value={kpis.driversOnDuty} />
          <KpiCard
            label="Fleet Utilization"
            value={kpis.fleetUtilizationPct.toFixed(1)}
            suffix="%"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border rounded-lg p-4">
          <h2 className="text-sm font-medium mb-3">Fleet Utilization</h2>
          {kpis && (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={[
                    { name: "On Trip", value: kpis.fleetUtilizationPct },
                    { name: "Idle", value: 100 - kpis.fleetUtilizationPct },
                  ]}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                >
                  <Cell fill="#2563eb" />
                  <Cell fill="#e5e7eb" />
                </Pie>
                <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="border rounded-lg p-4">
          <h2 className="text-sm font-medium mb-3">Cost Breakdown by Vehicle</h2>
          {costRows.length === 0 ? (
            <p className="text-sm text-gray-500 py-10 text-center">
              No cost data available for your role or date range.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={costRows}>
                <XAxis dataKey="registrationNumber" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="fuelCost" name="Fuel" stackId="cost" fill="#2563eb" />
                <Bar dataKey="maintenanceCost" name="Maintenance" stackId="cost" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
