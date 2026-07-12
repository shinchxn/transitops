// File: frontend/src/pages/FuelPage.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { api, PaginatedResponse, ApiError } from "../shared/api";
import { StatusBadge } from "../shared/colors";
import { SOCKET_EVENTS } from "../shared/socketEvents";
import { useAuth } from "../shared/AuthContext";
import { io, Socket } from "socket.io-client";
import axios from "axios";

interface FuelLog {
  id: string;
  vehicleId: string;
  tripId: string | null;
  liters: number;
  cost: number;
  date: string;
}

interface Expense {
  id: string;
  vehicleId: string;
  type: string;
  amount: number;
  date: string;
  notes: string | null;
}

interface VehicleLite {
  id: string;
  registrationNumber: string;
  name: string;
  status: string;
}

const emptyMeta = { total: 0, page: 1, limit: 20, totalPages: 1 };

export default function FuelPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as "fuel" | "expenses") || "fuel";
  const vehicleId = searchParams.get("vehicleId") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);

  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [meta, setMeta] = useState(emptyMeta);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState<"fuel" | "expense" | null>(null);
  const [vehicles, setVehicles] = useState<VehicleLite[]>([]);

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (vehicleId) params.vehicleId = vehicleId;
      if (activeTab === "fuel") {
        const res = await api.get<PaginatedResponse<FuelLog>>("/fuel-logs", { params });
        setFuelLogs(res.data.data);
      } else {
        const res = await api.get<PaginatedResponse<Expense>>("/expenses", { params });
        setExpenses(res.data.data);
      }
      const lastRes = await Promise.resolve();
      void lastRes;
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, vehicleId, page]);

  // Separate call so `meta` always reflects the tab actually being displayed,
  // without a second network round trip inside fetchData above.
  const fetchDataWithMeta = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (vehicleId) params.vehicleId = vehicleId;
      if (activeTab === "fuel") {
        const res = await api.get<PaginatedResponse<FuelLog>>("/fuel-logs", { params });
        setFuelLogs(res.data.data);
        setMeta(res.data.meta);
      } else {
        const res = await api.get<PaginatedResponse<Expense>>("/expenses", { params });
        setExpenses(res.data.data);
        setMeta(res.data.meta);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, vehicleId, page]);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);
  useEffect(() => { fetchDataWithMeta(); }, [fetchDataWithMeta]);

  const socketRef = useRef<Socket | null>(null);
  useEffect(() => {
    const socket = io("/", { withCredentials: true });
    socketRef.current = socket;
    // Keeps the "linked vehicle status" column live without refetching the whole list.
    socket.on(SOCKET_EVENTS.VEHICLE_UPDATED, (payload: { data: { vehicle: VehicleLite } }) => {
      setVehicles((prev) => prev.map((v) => (v.id === payload.data.vehicle.id ? payload.data.vehicle : v)));
    });
    return () => { socket.disconnect(); };
  }, []);

  function handleFilter(key: string, value: string) {
    const newParams = new URLSearchParams(searchParams);
    if (value) newParams.set(key, value);
    else newParams.delete(key);
    newParams.set("page", "1");
    setSearchParams(newParams);
  }

  function setTab(tab: "fuel" | "expenses") {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tab", tab);
    newParams.set("page", "1");
    setSearchParams(newParams);
  }

  function vehicleLabel(id: string) {
    const v = vehicleMap.get(id);
    return v ? `${v.registrationNumber} — ${v.name}` : id;
  }

  const canAddFuel = user?.role === "DRIVER" || user?.role === "FLEET_MANAGER";
  const canAddExpense = user?.role === "FLEET_MANAGER" || user?.role === "FINANCIAL_ANALYST";
  const rows = activeTab === "fuel" ? fuelLogs : expenses;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fuel & Expenses</h1>
          <p className="text-sm text-gray-500">Track fuel logs and operational expenses ({meta.total} total)</p>
        </div>
        <div className="flex gap-2">
          {canAddFuel && activeTab === "fuel" && (
            <button onClick={() => setModalOpen("fuel")} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
              + Log Fuel
            </button>
          )}
          {canAddExpense && activeTab === "expenses" && (
            <button onClick={() => setModalOpen("expense")} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
              + Add Expense
            </button>
          )}
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button onClick={() => setTab("fuel")} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === "fuel" ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}>
            Fuel Logs
          </button>
          <button onClick={() => setTab("expenses")} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === "expenses" ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}>
            Expenses
          </button>
        </nav>
      </div>

      <div className="flex gap-4 items-center flex-wrap bg-white p-4 rounded-xl border border-gray-200">
        <select value={vehicleId} onChange={(e) => handleFilter("vehicleId", e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500">
          <option value="">All Vehicles</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>{v.registrationNumber} — {v.name}</option>
          ))}
        </select>
        {vehicleId && (
          <button onClick={() => handleFilter("vehicleId", "")} className="text-sm text-gray-500 hover:text-gray-700 underline">
            Clear filter
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        {activeTab === "fuel" ? (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-500">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-500">Vehicle</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-500">Vehicle Status</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-500">Liters</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-500">Cost ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && fuelLogs.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-gray-500">Loading fuel logs...</td></tr>
              ) : fuelLogs.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-gray-500">No fuel logs found.</td></tr>
              ) : fuelLogs.map(l => {
                const v = vehicleMap.get(l.vehicleId);
                return (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{new Date(l.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-gray-900">{vehicleLabel(l.vehicleId)}</td>
                    <td className="px-4 py-3">{v ? <StatusBadge status={v.status} /> : <span className="text-gray-400 text-xs">—</span>}</td>
                    <td className="px-4 py-3">{l.liters}</td>
                    <td className="px-4 py-3">{l.cost}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-500">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-500">Vehicle</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-500">Vehicle Status</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-500">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-500">Amount ($)</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-500">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && expenses.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-gray-500">Loading expenses...</td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-gray-500">No expenses found.</td></tr>
              ) : expenses.map(e => {
                const v = vehicleMap.get(e.vehicleId);
                return (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{new Date(e.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-gray-900">{vehicleLabel(e.vehicleId)}</td>
                    <td className="px-4 py-3">{v ? <StatusBadge status={v.status} /> : <span className="text-gray-400 text-xs">—</span>}</td>
                    <td className="px-4 py-3">{e.type}</td>
                    <td className="px-4 py-3">{e.amount}</td>
                    <td className="px-4 py-3 text-gray-500">{e.notes || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {rows.length > 0 && (
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

      {modalOpen === "fuel" && <FuelModal vehicles={vehicles} onClose={() => setModalOpen(null)} onSuccess={() => { setModalOpen(null); fetchDataWithMeta(); }} />}
      {modalOpen === "expense" && <ExpenseModal vehicles={vehicles} onClose={() => setModalOpen(null)} onSuccess={() => { setModalOpen(null); fetchDataWithMeta(); }} />}
    </div>
  );
}

function FuelModal({ vehicles, onClose, onSuccess }: { vehicles: VehicleLite[]; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ vehicleId: "", tripId: "", liters: "", cost: "" });
  const [error, setError] = useState<ApiError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        vehicleId: form.vehicleId,
        liters: Number(form.liters),
        cost: Number(form.cost),
      };
      if (form.tripId) payload.tripId = form.tripId;
      await api.post("/fuel-logs", payload);
      onSuccess();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) setError(err.response.data as ApiError);
      else alert("Error saving fuel log");
    } finally {
      setSubmitting(false);
    }
  }

  function getFieldError(path: string) {
    return error?.fields?.find((f) => f.path === path)?.message;
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Log Fuel</h2>
        {error && !error.fields && <div className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded">{error.message}</div>}
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="block mb-1 font-medium">Vehicle</label>
            <select required value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
              className="w-full border rounded px-3 py-2">
              <option value="" disabled>Select a vehicle...</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.registrationNumber} — {v.name}</option>
              ))}
            </select>
            {getFieldError("vehicleId") && <p className="text-red-600 text-xs mt-1">{getFieldError("vehicleId")}</p>}
          </div>
          <div>
            <label className="block mb-1 font-medium">Trip ID (optional)</label>
            <input value={form.tripId} onChange={e => setForm({...form, tripId: e.target.value})} className="w-full border rounded px-3 py-2" placeholder="uuid, if this fill-up ties to a trip" />
            {getFieldError("tripId") && <p className="text-red-600 text-xs mt-1">{getFieldError("tripId")}</p>}
          </div>
          <div>
            <label className="block mb-1 font-medium">Liters</label>
            <input type="number" min="0" step="0.01" required value={form.liters} onChange={e => setForm({...form, liters: e.target.value})} className="w-full border rounded px-3 py-2" />
            {getFieldError("liters") && <p className="text-red-600 text-xs mt-1">{getFieldError("liters")}</p>}
          </div>
          <div>
            <label className="block mb-1 font-medium">Cost ($)</label>
            <input type="number" min="0" step="0.01" required value={form.cost} onChange={e => setForm({...form, cost: e.target.value})} className="w-full border rounded px-3 py-2" />
            {getFieldError("cost") && <p className="text-red-600 text-xs mt-1">{getFieldError("cost")}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
            <button type="submit" disabled={submitting || !form.vehicleId} className="px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50">
              {submitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ExpenseModal({ vehicles, onClose, onSuccess }: { vehicles: VehicleLite[]; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ vehicleId: "", type: "TOLL", amount: "", notes: "" });
  const [error, setError] = useState<ApiError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/expenses", { ...form, amount: Number(form.amount) });
      onSuccess();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) setError(err.response.data as ApiError);
      else alert("Error saving expense");
    } finally {
      setSubmitting(false);
    }
  }

  function getFieldError(path: string) {
    return error?.fields?.find((f) => f.path === path)?.message;
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Add Expense</h2>
        {error && !error.fields && <div className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded">{error.message}</div>}
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="block mb-1 font-medium">Vehicle</label>
            <select required value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
              className="w-full border rounded px-3 py-2">
              <option value="" disabled>Select a vehicle...</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.registrationNumber} — {v.name}</option>
              ))}
            </select>
            {getFieldError("vehicleId") && <p className="text-red-600 text-xs mt-1">{getFieldError("vehicleId")}</p>}
          </div>
          <div>
            <label className="block mb-1 font-medium">Type</label>
            <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full border rounded px-3 py-2">
              <option value="TOLL">Toll</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="OTHER">Other</option>
            </select>
            {getFieldError("type") && <p className="text-red-600 text-xs mt-1">{getFieldError("type")}</p>}
          </div>
          <div>
            <label className="block mb-1 font-medium">Amount ($)</label>
            <input type="number" min="0" step="0.01" required value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full border rounded px-3 py-2" />
            {getFieldError("amount") && <p className="text-red-600 text-xs mt-1">{getFieldError("amount")}</p>}
          </div>
          <div>
            <label className="block mb-1 font-medium">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full border rounded px-3 py-2" rows={2}></textarea>
            {getFieldError("notes") && <p className="text-red-600 text-xs mt-1">{getFieldError("notes")}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
            <button type="submit" disabled={submitting || !form.vehicleId} className="px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50">
              {submitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}