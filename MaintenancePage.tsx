// frontend/src/pages/MaintenancePage.tsx
import { useEffect, useState, useCallback } from "react";
import { apiClient } from "../shared/apiClient";
import { useAuth } from "../shared/AuthContext";
import { StatusBadge } from "../shared/components/StatusBadge";
import { socket } from "../shared/socket";

interface MaintenanceLog {
  id: string;
  vehicleId: string;
  description: string;
  cost: number;
  status: "OPEN" | "CLOSED";
  openedAt: string;
  closedAt: string | null;
}

interface Vehicle {
  id: string;
  registrationNumber: string;
  name: string;
  status: "AVAILABLE" | "ON_TRIP" | "IN_SHOP" | "RETIRED";
}

export default function MaintenancePage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [vehicles, setVehicles] = useState<Record<string, Vehicle>>({});
  const [statusFilter, setStatusFilter] = useState<"" | "OPEN" | "CLOSED">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formVehicleId, setFormVehicleId] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCost, setFormCost] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const canManage = user?.role === "FLEET_MANAGER";

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { sort: "-openedAt" };
      if (statusFilter) params.status = statusFilter;
      const res = await apiClient.get("/maintenance", { params });
      setLogs(res.data.items);
    } catch {
      setError("Couldn't load maintenance records. Try refreshing.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const loadVehicles = useCallback(async () => {
    const res = await apiClient.get("/vehicles");
    const map: Record<string, Vehicle> = {};
    for (const v of res.data as Vehicle[]) map[v.id] = v;
    setVehicles(map);
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  // Live vehicle status — a maintenance log's linked vehicle status
  // reflects instantly when another tab opens/closes maintenance or
  // dispatches a trip, without a manual refresh.
  useEffect(() => {
    function handleVehicleUpdated(updated: Vehicle) {
      setVehicles((prev) => ({ ...prev, [updated.id]: updated }));
    }
    socket.on("VEHICLE_UPDATED", handleVehicleUpdated);
    return () => {
      socket.off("VEHICLE_UPDATED", handleVehicleUpdated);
    };
  }, []);

  async function handleOpen(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!formVehicleId || !formDescription.trim()) {
      setFormError("Vehicle and description are required.");
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post("/maintenance", {
        vehicleId: formVehicleId,
        description: formDescription.trim(),
        cost: Number(formCost) || 0,
      });
      setFormVehicleId("");
      setFormDescription("");
      setFormCost("0");
      await loadLogs();
    } catch (err: any) {
      setFormError(
        err?.response?.data?.message ?? "Couldn't open the maintenance record."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClose(id: string) {
    try {
      await apiClient.patch(`/maintenance/${id}/close`);
      await loadLogs();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Couldn't close the record.");
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Maintenance</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "" | "OPEN" | "CLOSED")}
          className="border rounded px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      {canManage && (
        <form
          onSubmit={handleOpen}
          className="border rounded-lg p-4 space-y-3 bg-gray-50 dark:bg-gray-900"
        >
          <h2 className="text-sm font-medium">Open a new maintenance record</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={formVehicleId}
              onChange={(e) => setFormVehicleId(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            >
              <option value="">Select vehicle</option>
              {Object.values(vehicles)
                .filter((v) => v.status !== "RETIRED")
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registrationNumber} — {v.name}
                  </option>
                ))}
            </select>
            <input
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Description (e.g. Oil change)"
              maxLength={300}
              className="border rounded px-3 py-2 text-sm sm:col-span-1"
            />
            <input
              value={formCost}
              onChange={(e) => setFormCost(e.target.value)}
              type="number"
              min="0"
              step="0.01"
              placeholder="Cost"
              className="border rounded px-3 py-2 text-sm"
            />
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-sm rounded bg-blue-600 text-white disabled:opacity-50"
          >
            {submitting ? "Opening…" : "Open record"}
          </button>
        </form>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-800 text-left">
            <tr>
              <th className="px-3 py-2">Vehicle</th>
              <th className="px-3 py-2">Vehicle status</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">Cost</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Opened</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                  No maintenance records match this filter.
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const vehicle = vehicles[log.vehicleId];
                return (
                  <tr key={log.id} className="border-t">
                    <td className="px-3 py-2">
                      {vehicle ? `${vehicle.registrationNumber} — ${vehicle.name}` : log.vehicleId}
                    </td>
                    <td className="px-3 py-2">
                      {vehicle && <StatusBadge status={vehicle.status} />}
                    </td>
                    <td className="px-3 py-2">{log.description}</td>
                    <td className="px-3 py-2">₹{log.cost.toFixed(2)}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={log.status} />
                    </td>
                    <td className="px-3 py-2">
                      {new Date(log.openedAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {canManage && log.status === "OPEN" && (
                        <button
                          onClick={() => handleClose(log.id)}
                          className="text-blue-600 hover:underline"
                        >
                          Close
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
