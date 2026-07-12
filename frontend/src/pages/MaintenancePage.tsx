// File: frontend/src/pages/MaintenancePage.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { api, PaginatedResponse, ApiError } from "../shared/api";
import { StatusBadge } from "../shared/colors";
import { SOCKET_EVENTS } from "../shared/socketEvents";
import { useAuth } from "../shared/AuthContext";
import { io, Socket } from "socket.io-client";
import axios from "axios";

interface MaintenanceLog {
  id: string;
  vehicleId: string;
  description: string;
  cost: number;
  status: string;
  openedAt: string;
  closedAt: string | null;
}

interface VehicleLite {
  id: string;
  registrationNumber: string;
  name: string;
  status: string;
}

export default function MaintenancePage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [vehicles, setVehicles] = useState<VehicleLite[]>([]);

  const status = searchParams.get("status") || "";
  const vehicleId = searchParams.get("vehicleId") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);

  const vehicleMap = React.useMemo(() => {
    const m = new Map<string, VehicleLite>();
    vehicles.forEach((v) => m.set(v.id, v));
    return m;
  }, [vehicles]);

  const fetchVehicles = useCallback(async () => {
    try {
      const res = await api.get<PaginatedResponse<VehicleLite>>("/vehicles", {
        params: { limit: 100, sort: "-createdAt" },
      });
      setVehicles(res.data.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (status) params.status = status;
      if (vehicleId) params.vehicleId = vehicleId;
      const res = await api.get<PaginatedResponse<MaintenanceLog>>("/maintenance", { params });
      setLogs(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [status, vehicleId, page]);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);
  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const socketRef = useRef<Socket | null>(null);
  useEffect(() => {
    const socket = io("/", { withCredentials: true });
    socketRef.current = socket;
    socket.on(SOCKET_EVENTS.MAINTENANCE_OPENED, (payload: { data: { log: MaintenanceLog } }) => {
      setLogs((prev) => [payload.data.log, ...prev]);
    });
    socket.on(SOCKET_EVENTS.MAINTENANCE_CLOSED, (payload: { data: { log: MaintenanceLog } }) => {
      setLogs((prev) => prev.map((l) => (l.id === payload.data.log.id ? payload.data.log : l)));
    });
    // Keeps the "linked vehicle status" column live without refetching the whole list.
    socket.on(SOCKET_EVENTS.VEHICLE_UPDATED, (payload: { data: { vehicle: VehicleLite } }) => {
      setVehicles((prev) => prev.map((v) => (v.id === payload.data.vehicle.id ? payload.data.vehicle : v)));
    });
    return () => { socket.disconnect(); };
  }, []);

  async function handleClose(id: string) {
    if (!confirm("Are you sure you want to close this maintenance record?")) return;
    try {
      await api.patch(`/maintenance/${id}/close`);
      fetchLogs();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to close maintenance log.");
    }
  }

  function handleFilter(key: string, value: string) {
    const newParams = new URLSearchParams(searchParams);
    if (value) newParams.set(key, value);
    else newParams.delete(key);
    newParams.set("page", "1");
    setSearchParams(newParams);
  }

  function vehicleLabel(id: string) {
    const v = vehicleMap.get(id);
    return v ? `${v.registrationNumber} — ${v.name}` : id;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance</h1>
          <p className="text-sm text-gray-500">Track vehicle service and repairs ({meta.total} total)</p>
        </div>
        {user?.role === "FLEET_MANAGER" && (
          <button onClick={() => setModalOpen(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
            + Open Maintenance
          </button>
        )}
      </div>

      <div className="flex gap-4 items-center flex-wrap bg-white p-4 rounded-xl border border-gray-200">
        <select value={status} onChange={(e) => handleFilter("status", e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500">
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="CLOSED">Closed</option>
        </select>
        <select value={vehicleId} onChange={(e) => handleFilter("vehicleId", e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500">
          <option value="">All Vehicles</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>{v.registrationNumber} — {v.name}</option>
          ))}
        </select>
        {(status || vehicleId) && (
          <button
            onClick={() => setSearchParams(new URLSearchParams({ page: "1" }))}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-500">Vehicle</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-500">Vehicle Status</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-500">Description</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-500">Cost ($)</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-500">Opened</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-500">Log Status</th>
              {user?.role === "FLEET_MANAGER" && <th className="px-4 py-3 text-right font-semibold text-gray-500">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && logs.length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-gray-500">Loading maintenance records...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-gray-500">No maintenance records found.</td></tr>
            ) : logs.map(l => {
              const v = vehicleMap.get(l.vehicleId);
              return (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{vehicleLabel(l.vehicleId)}</td>
                  <td className="px-4 py-3">{v ? <StatusBadge status={v.status} /> : <span className="text-gray-400 text-xs">—</span>}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{l.description}</td>
                  <td className="px-4 py-3 text-gray-600">{l.cost}</td>
                  <td className="px-4 py-3 text-gray-600">{new Date(l.openedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                  {user?.role === "FLEET_MANAGER" && (
                    <td className="px-4 py-3 text-right">
                      {l.status === "OPEN" && (
                        <button onClick={() => handleClose(l.id)} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">Close</button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {logs.length > 0 && (
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>Page {meta.page} of {meta.totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => handleFilter("page", String(page - 1))}
              className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-50">Prev</button>
            <button disabled={page >= meta.totalPages} onClick={() => handleFilter("page", String(page + 1))}
              className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-50">Next</button>
          </div>
        </div>
      )}

      {modalOpen && (
        <MaintenanceModal vehicles={vehicles} onClose={() => setModalOpen(false)} onSuccess={() => { setModalOpen(false); fetchLogs(); }} />
      )}
    </div>
  );
}

function MaintenanceModal({ vehicles, onClose, onSuccess }: { vehicles: VehicleLite[]; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ vehicleId: "", description: "", cost: "0" });
  const [error, setError] = useState<ApiError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/maintenance", { ...form, cost: Number(form.cost) });
      onSuccess();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) setError(err.response.data as ApiError);
    } finally {
      setSubmitting(false);
    }
  }

  function getFieldError(path: string) {
    return error?.fields?.find((f) => f.path === path)?.message;
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4">Open Maintenance Record</h2>
        {error && !error.fields && <div className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded">{error.message}</div>}
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="block font-medium mb-1">Vehicle</label>
            <select required value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
              className="w-full border rounded-lg px-3 py-2">
              <option value="" disabled>Select a vehicle...</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.registrationNumber} — {v.name}</option>
              ))}
            </select>
            {getFieldError("vehicleId") && <p className="text-red-600 text-xs mt-1">{getFieldError("vehicleId")}</p>}
          </div>
          <div>
            <label className="block font-medium mb-1">Description</label>
            <textarea required value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full border rounded-lg px-3 py-2" rows={3}></textarea>
            {getFieldError("description") && <p className="text-red-600 text-xs mt-1">{getFieldError("description")}</p>}
          </div>
          <div>
            <label className="block font-medium mb-1">Estimated Cost ($)</label>
            <input type="number" min="0" step="0.01" required value={form.cost} onChange={e => setForm({...form, cost: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            {getFieldError("cost") && <p className="text-red-600 text-xs mt-1">{getFieldError("cost")}</p>}
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={submitting || !form.vehicleId} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {submitting ? "Opening..." : "Open"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
