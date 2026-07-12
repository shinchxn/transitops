// File: frontend/src/pages/DashboardPage.tsx
import { useState, useEffect } from "react";
import { api } from "../shared/api";
import { useAuth } from "../shared/AuthContext";
import { Link } from "react-router-dom";

export default function DashboardPage() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<any>(null);

  useEffect(() => {
    api.get("/reports/dashboard-kpis").then(res => setKpis(res.data)).catch(console.error);
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.name}</h1>
        <p className="mt-1 text-sm text-gray-500">Here's what's happening with your fleet today.</p>
      </header>

      {kpis ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Active Vehicles" value={kpis.activeVehicles} subtitle={`${kpis.availableVehicles} available`} />
          <KpiCard title="On Trip" value={kpis.vehiclesOnTrip} subtitle={`${kpis.driversOnDuty} drivers on duty`} color="text-amber-600" />
          <KpiCard title="In Maintenance" value={kpis.vehiclesInMaintenance} color="text-red-600" />
          <KpiCard title="Fleet Utilization" value={`${kpis.fleetUtilizationPct}%`} />
        </div>
      ) : (
        <div className="text-gray-500">Loading KPIs...</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link to="/trips" className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 p-4 rounded-lg flex flex-col items-center justify-center text-center font-medium transition">
              View Trips
            </Link>
            <Link to="/vehicles" className="bg-green-50 hover:bg-green-100 text-green-700 p-4 rounded-lg flex flex-col items-center justify-center text-center font-medium transition">
              Manage Fleet
            </Link>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">System Status</h2>
          <p className="text-gray-600 text-sm">
            All systems operational. Socket connection established.
          </p>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value, subtitle, color = "text-gray-900" }: { title: string, value: string | number, subtitle?: string, color?: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
      {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
    </div>
  );
}
