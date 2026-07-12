// File: frontend/src/pages/VehiclesPage.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { api, PaginatedResponse, ApiError } from "../shared/api";
import { StatusBadge } from "../shared/colors";
import { SOCKET_EVENTS } from "../shared/socketEvents";
import { useAuth } from "../shared/AuthContext";
import { io, Socket } from "socket.io-client";
import axios from "axios";

interface Vehicle {
  id: string;
  registrationNumber: string;
  name: string;
  type: string;
  maxLoadCapacityKg: number;
  odometerKm: number;
  acquisitionCost: number;
  status: string;
  region: string | null;
}

export default function VehiclesPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  
  const status = searchParams.get("status") || "";
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20, sort: "-createdAt" };
      if (status) params.status = status;
      if (search) params.search = search;
      
      const res = await api.get<PaginatedResponse<Vehicle>>("/vehicles", { params });
      setVehicles(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [status, search, page]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  // Socket subscription
  const socketRef = useRef<Socket | null>(null);
  useEffect(() => {
    const socket = io("http://localhost:4000", { withCredentials: true });
    socketRef.current = socket;
    socket.on(SOCKET_EVENTS.VEHICLE_UPDATED, (payload: { event: string; data: { vehicle: Vehicle } }) => {
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehicles</h1>
          <p className="text-sm text-gray-500">Manage fleet vehicles ({meta.total} total)</p>
        </div>
        {user?.role === "FLEET_MANAGER" && (
          <button onClick={() => { setEditVehicle(null); setModalOpen(true); }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
            + Add Vehicle
          </button>
        )}
      </div>

      <div className="flex gap-4 items-center flex-wrap bg-white p-4 rounded-xl border border-gray-200">
        <input type="text" placeholder="Search name or reg..." value={search}
          onChange={(e) => handleFilter("search", e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-64 focus:ring-2 focus:ring-indigo-500"
        />
        <select value={status} onChange={(e) => handleFilter("status", e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500">
          <option value="">All Statuses</option>
          <option value="AVAILABLE">Available</option>
          <option value="ON_TRIP">On Trip</option>
          <option value="IN_SHOP">In Shop</option>
          <option value="RETIRED">Retired</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-500">Registration</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-500">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-500">Type</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-500">Capacity (kg)</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-500">Odometer</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-500">Status</th>
              {user?.role === "FLEET_MANAGER" && <th className="px-4 py-3 text-right font-semibold text-gray-500">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && vehicles.length === 0 ? (
              <tr><td colSpan={7} className="p-4 text-center text-gray-500">Loading...</td></tr>
            ) : vehicles.map(v => (
              <tr key={v.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{v.registrationNumber}</td>
                <td className="px-4 py-3 text-gray-600">{v.name}</td>
                <td className="px-4 py-3 text-gray-600">{v.type}</td>
                <td className="px-4 py-3 text-gray-600">{v.maxLoadCapacityKg}</td>
                <td className="px-4 py-3 text-gray-600">{v.odometerKm} km</td>
                <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                {user?.role === "FLEET_MANAGER" && (
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => { setEditVehicle(v); setModalOpen(true); }}
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">Edit</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination controls */}
      <div className="flex justify-between items-center text-sm text-gray-600">
        <span>Page {meta.page} of {meta.totalPages}</span>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => handleFilter("page", String(page - 1))}
            className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-50">Prev</button>
          <button disabled={page >= meta.totalPages} onClick={() => handleFilter("page", String(page + 1))}
            className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-50">Next</button>
        </div>
      </div>

      {modalOpen && (
        <VehicleModal vehicle={editVehicle} onClose={() => setModalOpen(false)} onSuccess={() => { setModalOpen(false); fetchVehicles(); }} />
      )}
    </div>
  );
}

function VehicleModal({ vehicle, onClose, onSuccess }: { vehicle: Vehicle | null, onClose: () => void, onSuccess: () => void }) {
  const [form, setForm] = useState({
    registrationNumber: vehicle?.registrationNumber || "",
    name: vehicle?.name || "",
    type: vehicle?.type || "",
    maxLoadCapacityKg: vehicle?.maxLoadCapacityKg?.toString() || "",
    acquisitionCost: vehicle?.acquisitionCost?.toString() || "",
    region: vehicle?.region || "",
    odometerKm: vehicle?.odometerKm?.toString() || "0",
    status: vehicle?.status || "AVAILABLE",
  });
  const [error, setError] = useState<ApiError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = { ...form, maxLoadCapacityKg: Number(form.maxLoadCapacityKg), acquisitionCost: Number(form.acquisitionCost), odometerKm: Number(form.odometerKm) };
      if (vehicle) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { registrationNumber, ...updatePayload } = payload; // immutable
        await api.patch(`/vehicles/${vehicle.id}`, updatePayload);
      } else {
        await api.post("/vehicles", payload);
      }
      onSuccess();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data as ApiError);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function getFieldError(path: string) {
    return error?.fields?.find(f => f.path === path)?.message;
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <h2 className="text-xl font-bold mb-4">{vehicle ? "Edit Vehicle" : "New Vehicle"}</h2>
        {error && !error.fields && <div className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded">{error.message}</div>}
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          {!vehicle && (
            <div>
              <label className="block font-medium mb-1">Registration Number</label>
              <input required value={form.registrationNumber} onChange={e => setForm({...form, registrationNumber: e.target.value})}
                className="w-full border rounded-lg px-3 py-2" />
              {getFieldError("registrationNumber") && <p className="text-red-600 text-xs mt-1">{getFieldError("registrationNumber")}</p>}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-1">Name</label>
              <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
              {getFieldError("name") && <p className="text-red-600 text-xs mt-1">{getFieldError("name")}</p>}
            </div>
            <div>
              <label className="block font-medium mb-1">Type</label>
              <input required value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block font-medium mb-1">Capacity (kg)</label>
              <input type="number" required value={form.maxLoadCapacityKg} onChange={e => setForm({...form, maxLoadCapacityKg: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block font-medium mb-1">Acquisition Cost</label>
              <input type="number" required value={form.acquisitionCost} onChange={e => setForm({...form, acquisitionCost: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>
          
          {vehicle && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-medium mb-1">Odometer (km)</label>
                <input type="number" required value={form.odometerKm} onChange={e => setForm({...form, odometerKm: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block font-medium mb-1">Status</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                  <option value="AVAILABLE">Available</option>
                  <option value="RETIRED">Retired</option>
                </select>
                {getFieldError("status") && <p className="text-red-600 text-xs mt-1">{getFieldError("status")}</p>}
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {submitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
