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

export default function MaintenancePage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  
  const status = searchParams.get("status") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (status) params.status = status;
      const res = await api.get<PaginatedResponse<MaintenanceLog>>("/maintenance", { params });
      setLogs(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [status, page]);

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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance</h1>
          <p className="text-sm text-gray-500">Track vehicle service and repairs</p>
        </div>
        {user?.role === "FLEET_MANAGER" && (
          <button onClick={() => setModalOpen(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
            + Open Maintenance
          </button>
        )}
      </div>

      <div className="flex gap-4 items-center bg-white p-4 rounded-xl border border-gray-200">
        <select value={status} onChange={(e) => handleFilter("status", e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500">
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-500">Vehicle ID</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-500">Description</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-500">Cost ($)</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-500">Opened</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-500">Status</th>
              {user?.role === "FLEET_MANAGER" && <th className="px-4 py-3 text-right font-semibold text-gray-500">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && logs.length === 0 ? (
              <tr><td colSpan={6} className="p-4 text-center text-gray-500">Loading...</td></tr>
            ) : logs.map(l => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600 font-mono text-xs">{l.vehicleId}</td>
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
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <MaintenanceModal onClose={() => setModalOpen(false)} onSuccess={() => { setModalOpen(false); fetchLogs(); }} />
      )}
    </div>
  );
}

function MaintenanceModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
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

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4">Open Maintenance Record</h2>
        {error && !error.fields && <div className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded">{error.message}</div>}
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="block font-medium mb-1">Vehicle ID</label>
            <input required value={form.vehicleId} onChange={e => setForm({...form, vehicleId: e.target.value})} className="w-full border rounded-lg px-3 py-2" placeholder="uuid" />
          </div>
          <div>
            <label className="block font-medium mb-1">Description</label>
            <textarea required value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full border rounded-lg px-3 py-2" rows={3}></textarea>
          </div>
          <div>
            <label className="block font-medium mb-1">Estimated Cost ($)</label>
            <input type="number" required value={form.cost} onChange={e => setForm({...form, cost: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">Open</button>
          </div>
        </form>
      </div>
    </div>
  );
}
