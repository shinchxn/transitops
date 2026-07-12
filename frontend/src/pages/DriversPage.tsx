// File: frontend/src/pages/DriversPage.tsx
// Driver management — list, filter, search, sort, paginate, and manage drivers with license expiry tracking.

import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/shared/api";
import { socket, SOCKET_EVENTS } from "@/shared/socket";
import { StatusBadge, getExpiryColor, getExpiryLabel } from "@/shared/colors";
import type { Driver, DriverStatus } from "@/shared/types";

export default function DriversPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string>("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Parse query params
  const query = {
    search: searchParams.get("search") || "",
    status: (searchParams.get("status") || "") as DriverStatus,
    sort: searchParams.get("sort") || "name",
    page: parseInt(searchParams.get("page") || "1"),
    limit: parseInt(searchParams.get("limit") || "20"),
  };

  // Fetch drivers
  const fetchDrivers = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.get("/drivers", {
        params: {
          search: query.search || undefined,
          status: query.status || undefined,
          sort: query.sort,
          page: query.page,
          limit: query.limit,
        },
      });
      setDrivers(result.data);
      setMeta(result.meta);
    } catch (err: any) {
      setError(err.message || "Failed to load drivers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, [searchParams]);

  // Subscribe to driver updates
  useEffect(() => {
    socket.on(SOCKET_EVENTS.DRIVER_UPDATED, (updated: Driver) => {
      setDrivers((prev) =>
        prev.map((d) => (d.id === updated.id ? updated : d))
      );
    });
    return () => {
      socket.off(SOCKET_EVENTS.DRIVER_UPDATED);
    };
  }, []);

  const updateQueryParam = (key: string, value: string | number | null) => {
    const params = new URLSearchParams(searchParams);
    if (value === null || value === "") {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
    params.set("page", "1");
    setSearchParams(params);
  };

  const toggleSort = (field: string) => {
    const current = query.sort;
    const newSort = current === field ? `-${field}` : field;
    updateQueryParam("sort", newSort);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Drivers</h1>
        <button
          onClick={() => {
            setEditingId("");
            setShowForm(true);
            setFormErrors({});
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Add Driver
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Search name or license..."
            value={query.search}
            onChange={(e) => updateQueryParam("search", e.target.value)}
            className="px-3 py-2 border rounded"
          />
          <select
            value={query.status}
            onChange={(e) => updateQueryParam("status", e.target.value)}
            className="px-3 py-2 border rounded"
          >
            <option value="">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="ON_TRIP">On Trip</option>
            <option value="OFF_DUTY">Off Duty</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
          <select
            value={query.sort}
            onChange={(e) => updateQueryParam("sort", e.target.value)}
            className="px-3 py-2 border rounded"
          >
            <option value="name">Name (A-Z)</option>
            <option value="-name">Name (Z-A)</option>
            <option value="licenseExpiryDate">License Expiry (Early)</option>
            <option value="-licenseExpiryDate">License Expiry (Late)</option>
            <option value="safetyScore">Safety Score (Low)</option>
            <option value="-safetyScore">Safety Score (High)</option>
          </select>
        </div>
      </div>

      {error && <div className="bg-red-100 text-red-800 p-3 rounded mb-4">{error}</div>}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-4 py-2 text-left cursor-pointer hover:bg-gray-200" onClick={() => toggleSort("name")}>
                Name
              </th>
              <th className="border px-4 py-2 text-left">License #</th>
              <th className="border px-4 py-2 text-left">Category</th>
              <th className="border px-4 py-2 text-left">License Expiry</th>
              <th className="border px-4 py-2 text-left">Contact</th>
              <th className="border px-4 py-2 text-left cursor-pointer hover:bg-gray-200" onClick={() => toggleSort("safetyScore")}>
                Safety Score
              </th>
              <th className="border px-4 py-2 text-left">Status</th>
              <th className="border px-4 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="border px-4 py-4 text-center">Loading...</td>
              </tr>
            ) : drivers.length === 0 ? (
              <tr>
                <td colSpan={8} className="border px-4 py-4 text-center text-gray-500">No drivers found</td>
              </tr>
            ) : (
              drivers.map((d) => {
                const expiryDate = new Date(d.licenseExpiryDate);
                const expiryColor = getExpiryColor(expiryDate);
                const expiryLabel = getExpiryLabel(expiryDate);
                return (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="border px-4 py-2 font-medium">{d.name}</td>
                    <td className="border px-4 py-2 font-mono">{d.licenseNumber}</td>
                    <td className="border px-4 py-2">{d.licenseCategory}</td>
                    <td className="border px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span>{expiryDate.toLocaleDateString()}</span>
                        {expiryLabel && (
                          <span className={`px-2 py-1 rounded text-xs font-medium border ${expiryColor}`}>
                            {expiryLabel}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="border px-4 py-2">{d.contactNumber}</td>
                    <td className="border px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${d.safetyScore}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{d.safetyScore}%</span>
                      </div>
                    </td>
                    <td className="border px-4 py-2">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="border px-4 py-2 text-center">
                      <button
                        onClick={() => {
                          setEditingId(d.id);
                          setShowForm(true);
                          setFormErrors({});
                        }}
                        className="text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => updateQueryParam("page", p)}
              className={`px-3 py-1 rounded border ${
                query.page === p ? "bg-blue-600 text-white" : "hover:bg-gray-100"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <DriverFormModal
          driverId={editingId}
          onClose={() => setShowForm(false)}
          onSave={() => {
            setShowForm(false);
            fetchDrivers();
          }}
          onErrors={setFormErrors}
          errors={formErrors}
        />
      )}
    </div>
  );
}

function DriverFormModal({
  driverId,
  onClose,
  onSave,
  onErrors,
  errors,
}: {
  driverId: string;
  onClose: () => void;
  onSave: () => void;
  onErrors: (err: Record<string, string>) => void;
  errors: Record<string, string>;
}) {
  const [driver, setDriver] = useState<Partial<Driver>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (driverId) {
      api.get(`/drivers/${driverId}`).then(setDriver).catch(console.error);
    }
  }, [driverId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    onErrors({});

    try {
      if (driverId) {
        // Edit — exclude licenseNumber
        const { licenseNumber, ...updateData } = driver;
        await api.patch(`/drivers/${driverId}`, updateData);
      } else {
        // Create
        await api.post("/drivers", driver);
      }
      onSave();
    } catch (err: any) {
      if (err.fields) {
        const fieldMap: Record<string, string> = {};
        err.fields.forEach((f: any) => {
          fieldMap[f.path] = f.message;
        });
        onErrors(fieldMap);
      } else {
        onErrors({ form: err.message });
      }
    } finally {
      setLoading(false);
    }
  };

  // Format date for input field (YYYY-MM-DD)
  const formatDateForInput = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toISOString().split("T")[0];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">
          {driverId ? "Edit Driver" : "Add Driver"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={driver.name || ""}
              onChange={(e) => setDriver({ ...driver, name: e.target.value })}
              className={`w-full px-3 py-2 border rounded ${errors.name ? "border-red-500" : ""}`}
              required
            />
            {errors.name && <p className="text-red-600 text-sm">{errors.name}</p>}
          </div>
          {!driverId && (
            <div>
              <label className="block text-sm font-medium mb-1">License Number</label>
              <input
                type="text"
                value={driver.licenseNumber || ""}
                onChange={(e) => setDriver({ ...driver, licenseNumber: e.target.value })}
                className={`w-full px-3 py-2 border rounded ${errors.licenseNumber ? "border-red-500" : ""}`}
                required
              />
              {errors.licenseNumber && <p className="text-red-600 text-sm">{errors.licenseNumber}</p>}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">License Category</label>
            <input
              type="text"
              placeholder="e.g., A, B, C, D"
              value={driver.licenseCategory || ""}
              onChange={(e) => setDriver({ ...driver, licenseCategory: e.target.value })}
              className={`w-full px-3 py-2 border rounded ${errors.licenseCategory ? "border-red-500" : ""}`}
              required
            />
            {errors.licenseCategory && <p className="text-red-600 text-sm">{errors.licenseCategory}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">License Expiry Date</label>
            <input
              type="date"
              value={formatDateForInput(driver.licenseExpiryDate)}
              onChange={(e) => setDriver({ ...driver, licenseExpiryDate: e.target.value })}
              className={`w-full px-3 py-2 border rounded ${errors.licenseExpiryDate ? "border-red-500" : ""}`}
              required
            />
            {errors.licenseExpiryDate && <p className="text-red-600 text-sm">{errors.licenseExpiryDate}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Contact Number</label>
            <input
              type="tel"
              value={driver.contactNumber || ""}
              onChange={(e) => setDriver({ ...driver, contactNumber: e.target.value })}
              className={`w-full px-3 py-2 border rounded ${errors.contactNumber ? "border-red-500" : ""}`}
              required
            />
            {errors.contactNumber && <p className="text-red-600 text-sm">{errors.contactNumber}</p>}
          </div>
          {driverId && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Safety Score (0-100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={driver.safetyScore || 100}
                  onChange={(e) => setDriver({ ...driver, safetyScore: parseInt(e.target.value) })}
                  className={`w-full px-3 py-2 border rounded ${errors.safetyScore ? "border-red-500" : ""}`}
                />
                {errors.safetyScore && <p className="text-red-600 text-sm">{errors.safetyScore}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={driver.status || "AVAILABLE"}
                  onChange={(e) => setDriver({ ...driver, status: e.target.value as DriverStatus })}
                  className={`w-full px-3 py-2 border rounded ${errors.status ? "border-red-500" : ""}`}
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="OFF_DUTY">Off Duty</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
                {errors.status && <p className="text-red-600 text-sm">{errors.status}</p>}
              </div>
            </>
          )}
          {errors.form && <p className="text-red-600">{errors.form}</p>}
          <div className="flex gap-3 justify-end mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
