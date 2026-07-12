// File: frontend/src/pages/DriversPage.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { api, PaginatedResponse, ApiError } from "../shared/api";
import { StatusBadge } from "../shared/colors";
import { SOCKET_EVENTS } from "../shared/socketEvents";
import { useAuth } from "../shared/AuthContext";
import { io, Socket } from "socket.io-client";
import axios from "axios";

interface Driver {
  id: string;
  name: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiryDate: string;
  contactNumber: string;
  safetyScore: number;
  status: string;
}

function LicenseBadge({ dateString }: { dateString: string }) {
  const expiry = new Date(dateString);
  const now = new Date();
  const diffDays = (expiry.getTime() - now.getTime()) / (1000 * 3600 * 24);
  
  if (diffDays < 0) {
    return <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-medium ml-2">Expired</span>;
  }
  if (diffDays <= 30) {
    return <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium ml-2">Expiring Soon</span>;
  }
  return null;
}

export default function DriversPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editDriver, setEditDriver] = useState<Driver | null>(null);
  
  const status = searchParams.get("status") || "";
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20, sort: "name" };
      if (status) params.status = status;
      if (search) params.search = search;
      
      const res = await api.get<PaginatedResponse<Driver>>("/drivers", { params });
      setDrivers(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [status, search, page]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const socketRef = useRef<Socket | null>(null);
  useEffect(() => {
    const socket = io("/", { withCredentials: true });
    socketRef.current = socket;
    socket.on(SOCKET_EVENTS.DRIVER_UPDATED, (payload: { event: string; data: { driver: Driver } }) => {
      setDrivers((prev) => prev.map((d) => (d.id === payload.data.driver.id ? payload.data.driver : d)));
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

  const canEdit = user?.role === "FLEET_MANAGER" || user?.role === "SAFETY_OFFICER";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Drivers</h1>
          <p className="text-sm text-gray-500">Manage fleet drivers ({meta.total} total)</p>
        </div>
        {user?.role === "FLEET_MANAGER" && (
          <button onClick={() => { setEditDriver(null); setModalOpen(true); }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
            + Add Driver
          </button>
        )}
      </div>

      <div className="flex gap-4 items-center flex-wrap bg-white p-4 rounded-xl border border-gray-200">
        <input type="text" placeholder="Search name or license..." value={search}
          onChange={(e) => handleFilter("search", e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-64 focus:ring-2 focus:ring-indigo-500"
        />
        <select value={status} onChange={(e) => handleFilter("status", e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500">
          <option value="">All Statuses</option>
          <option value="AVAILABLE">Available</option>
          <option value="ON_TRIP">On Trip</option>
          <option value="OFF_DUTY">Off Duty</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-500">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-500">License</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-500">Expiry</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-500">Contact</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-500">Safety Score</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-500">Status</th>
              {canEdit && <th className="px-4 py-3 text-right font-semibold text-gray-500">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && drivers.length === 0 ? (
              <tr><td colSpan={7} className="p-4 text-center text-gray-500">Loading...</td></tr>
            ) : drivers.map(d => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{d.name}</td>
                <td className="px-4 py-3 text-gray-600">{d.licenseNumber} ({d.licenseCategory})</td>
                <td className="px-4 py-3 text-gray-600">
                  {new Date(d.licenseExpiryDate).toLocaleDateString()}
                  <LicenseBadge dateString={d.licenseExpiryDate} />
                </td>
                <td className="px-4 py-3 text-gray-600">{d.contactNumber}</td>
                <td className="px-4 py-3 text-gray-900 font-medium">
                  {d.safetyScore}
                </td>
                <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                {canEdit && (
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => { setEditDriver(d); setModalOpen(true); }}
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">Edit</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
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
        <DriverModal driver={editDriver} onClose={() => setModalOpen(false)} onSuccess={() => { setModalOpen(false); fetchDrivers(); }} canEditSafety={canEdit} />
      )}
    </div>
  );
}

function DriverModal({ driver, onClose, onSuccess, canEditSafety }: { driver: Driver | null, onClose: () => void, onSuccess: () => void, canEditSafety: boolean }) {
  const [form, setForm] = useState({
    name: driver?.name || "",
    licenseNumber: driver?.licenseNumber || "",
    licenseCategory: driver?.licenseCategory || "",
    licenseExpiryDate: driver ? new Date(driver.licenseExpiryDate).toISOString().slice(0, 10) : "",
    contactNumber: driver?.contactNumber || "",
    safetyScore: driver?.safetyScore?.toString() || "100",
    status: driver?.status || "AVAILABLE",
  });
  const [error, setError] = useState<ApiError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = { ...form, licenseExpiryDate: new Date(form.licenseExpiryDate).toISOString() };
      if (driver) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { licenseNumber, ...updatePayload } = payload;
        const updateData: any = { ...updatePayload };
        if (canEditSafety) updateData.safetyScore = Number(form.safetyScore);
        await api.patch(`/drivers/${driver.id}`, updateData);
      } else {
        await api.post("/drivers", payload);
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
        <h2 className="text-xl font-bold mb-4">{driver ? "Edit Driver" : "New Driver"}</h2>
        {error && !error.fields && <div className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded">{error.message}</div>}
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          {!driver && (
            <div>
              <label className="block font-medium mb-1">License Number</label>
              <input required value={form.licenseNumber} onChange={e => setForm({...form, licenseNumber: e.target.value})}
                className="w-full border rounded-lg px-3 py-2" />
              {getFieldError("licenseNumber") && <p className="text-red-600 text-xs mt-1">{getFieldError("licenseNumber")}</p>}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-1">Name</label>
              <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block font-medium mb-1">Contact Number</label>
              <input required value={form.contactNumber} onChange={e => setForm({...form, contactNumber: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block font-medium mb-1">License Category</label>
              <input required value={form.licenseCategory} onChange={e => setForm({...form, licenseCategory: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block font-medium mb-1">Expiry Date</label>
              <input type="date" required value={form.licenseExpiryDate} onChange={e => setForm({...form, licenseExpiryDate: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>
          
          {driver && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-medium mb-1">Status</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                  <option value="AVAILABLE">Available</option>
                  <option value="OFF_DUTY">Off Duty</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
                {getFieldError("status") && <p className="text-red-600 text-xs mt-1">{getFieldError("status")}</p>}
              </div>
              {canEditSafety && (
                <div>
                  <label className="block font-medium mb-1">Safety Score (0-100)</label>
                  <input type="number" min="0" max="100" required value={form.safetyScore} onChange={e => setForm({...form, safetyScore: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                </div>
              )}
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
