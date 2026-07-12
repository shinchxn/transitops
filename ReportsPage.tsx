// frontend/src/pages/ReportsPage.tsx
import { useEffect, useState, useCallback } from "react";
import { apiClient } from "../shared/apiClient";
import { useAuth } from "../shared/AuthContext";

type ReportKey = "utilization" | "operational-cost" | "fuel-efficiency" | "vehicle-roi";

interface TabDef {
  key: ReportKey;
  label: string;
  roles: string[] | "any";
}

const TABS: TabDef[] = [
  { key: "utilization", label: "Fleet Utilization", roles: "any" },
  {
    key: "operational-cost",
    label: "Operational Cost",
    roles: ["FINANCIAL_ANALYST", "FLEET_MANAGER"],
  },
  {
    key: "fuel-efficiency",
    label: "Fuel Efficiency",
    roles: ["FINANCIAL_ANALYST", "FLEET_MANAGER"],
  },
  { key: "vehicle-roi", label: "Vehicle ROI", roles: ["FINANCIAL_ANALYST"] },
];

export default function ReportsPage() {
  const { user } = useAuth();

  const visibleTabs = TABS.filter(
    (tab) => tab.roles === "any" || (user && tab.roles.includes(user.role))
  );

  const [activeTab, setActiveTab] = useState<ReportKey>(visibleTabs[0]?.key ?? "utilization");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const rangeParams = useCallback(() => {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    return params;
  }, [from, to]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let endpoint = "";
      switch (activeTab) {
        case "utilization":
          endpoint = "/reports/fleet-utilization";
          break;
        case "operational-cost":
          endpoint = "/reports/operational-cost";
          break;
        case "fuel-efficiency":
          endpoint = "/reports/fuel-efficiency";
          break;
        case "vehicle-roi":
          endpoint = "/reports/vehicle-roi";
          break;
      }
      const params = activeTab === "utilization" ? {} : rangeParams();
      const res = await apiClient.get(endpoint, { params });
      const data = res.data;
      // fleet-utilization returns { byStatus, fleetUtilizationPct }, the
      // rest already return arrays of rows.
      setRows(activeTab === "utilization" ? data.byStatus : data);
    } catch {
      setError("Couldn't load this report — you may not have access to it.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, rangeParams]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  async function handleExport() {
    setExporting(true);
    try {
      const params = { report: activeTab, format: "csv", ...rangeParams() };
      const res = await apiClient.get("/reports/export", {
        params,
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError("Couldn't export this report.");
    } finally {
      setExporting(false);
    }
  }

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold">Reports</h1>
        <div className="flex items-center gap-2">
          {activeTab !== "utilization" && (
            <>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="border rounded px-2 py-1.5 text-sm"
              />
              <span className="text-gray-400 text-sm">to</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="border rounded px-2 py-1.5 text-sm"
              />
            </>
          )}
          <button
            onClick={handleExport}
            disabled={exporting || rows.length === 0}
            className="px-3 py-1.5 text-sm rounded border disabled:opacity-50"
          >
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b flex-wrap">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 text-sm border-b-2 ${
              activeTab === tab.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-800 text-left">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-3 py-2 whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length || 1} className="px-3 py-6 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length || 1} className="px-3 py-6 text-center text-gray-500">
                  No data for this report yet.
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} className="border-t">
                  {columns.map((col) => {
                    const value = row[col];
                    const display =
                      value === null
                        ? "—"
                        : typeof value === "number"
                        ? Number.isInteger(value)
                          ? value
                          : value.toFixed(2)
                        : String(value);
                    return (
                      <td key={col} className="px-3 py-2 whitespace-nowrap">
                        {display}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
