// File: frontend/src/pages/ReportsPage.tsx
import { useState, useEffect } from "react";
import { api } from "../shared/api";
import { useAuth } from "../shared/AuthContext";

export default function ReportsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"utilization" | "cost" | "efficiency" | "roi">("utilization");
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    let endpoint = "";
    if (activeTab === "utilization") endpoint = "/reports/fleet-utilization";
    else if (activeTab === "cost") endpoint = "/reports/operational-cost";
    else if (activeTab === "efficiency") endpoint = "/reports/fuel-efficiency";
    else if (activeTab === "roi") endpoint = "/reports/vehicle-roi";

    api.get(endpoint).then(res => setData(res.data)).catch(console.error).finally(() => setLoading(false));
  }, [activeTab]);

  const canExport = user?.role === "FINANCIAL_ANALYST" || user?.role === "FLEET_MANAGER";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm text-gray-500">Live operational and financial metrics</p>
        </div>
        {canExport && (
          <a href="/api/reports/export?format=csv" download
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition">
            Export CSV
          </a>
        )}
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: "utilization", label: "Fleet Utilization" },
            { id: "cost", label: "Operational Cost" },
            { id: "efficiency", label: "Fuel Efficiency" },
            { id: "roi", label: "Vehicle ROI" },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} 
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {loading ? <div className="text-gray-500">Loading report data...</div> : (
          <div className="overflow-x-auto">
            {activeTab === "utilization" && data && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Active Vehicles</p>
                    <p className="text-2xl font-bold">{data.activeVehicles}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Vehicles on Trip</p>
                    <p className="text-2xl font-bold">{data.vehiclesOnTrip}</p>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <p className="text-sm text-indigo-600">Utilization Rate</p>
                    <p className="text-2xl font-bold text-indigo-900">{data.fleetUtilizationPct}%</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "cost" && Array.isArray(data) && (
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Vehicle ID / Reg</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-right">Fuel Cost ($)</th>
                    <th className="px-4 py-3 text-right">Maintenance Cost ($)</th>
                    <th className="px-4 py-3 text-right font-bold">Total Cost ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map(v => (
                    <tr key={v.vehicleId}>
                      <td className="px-4 py-3"><div className="font-medium">{v.registrationNumber}</div><div className="text-xs text-gray-500">{v.vehicleId}</div></td>
                      <td className="px-4 py-3">{v.name}</td>
                      <td className="px-4 py-3 text-right">{v.fuelCost}</td>
                      <td className="px-4 py-3 text-right">{v.maintenanceCost}</td>
                      <td className="px-4 py-3 text-right font-bold">{v.totalOperationalCost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === "efficiency" && Array.isArray(data) && (
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Vehicle / Reg</th>
                    <th className="px-4 py-3 text-right">Total Distance (km)</th>
                    <th className="px-4 py-3 text-right">Fuel Consumed (L)</th>
                    <th className="px-4 py-3 text-right font-bold">Efficiency (km/L)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map(v => (
                    <tr key={v.vehicleId}>
                      <td className="px-4 py-3 font-medium">{v.registrationNumber}</td>
                      <td className="px-4 py-3 text-right">{v.totalDistanceKm}</td>
                      <td className="px-4 py-3 text-right">{v.totalFuelLtr}</td>
                      <td className="px-4 py-3 text-right font-bold">{v.efficiencyKmPerLtr ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === "roi" && Array.isArray(data) && (
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Vehicle / Reg</th>
                    <th className="px-4 py-3 text-right">Acquisition ($)</th>
                    <th className="px-4 py-3 text-right">Total Ops Cost ($)</th>
                    <th className="px-4 py-3 text-right font-bold">Cost/Acquisition Ratio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map(v => (
                    <tr key={v.vehicleId}>
                      <td className="px-4 py-3 font-medium">{v.registrationNumber}</td>
                      <td className="px-4 py-3 text-right">{v.acquisitionCost}</td>
                      <td className="px-4 py-3 text-right">{v.totalOperationalCost}</td>
                      <td className="px-4 py-3 text-right font-bold">{v.costToAcquisitionRatio ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
