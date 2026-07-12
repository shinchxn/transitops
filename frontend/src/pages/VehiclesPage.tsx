// File: frontend/src/pages/VehiclesPage.tsx
// Fleet vehicle registry — list, filter, search, sort, paginate, and manage vehicles.

import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/shared/api";
import { socket, SOCKET_EVENTS } from "@/shared/socket";
import { StatusBadge } from "@/shared/colors";
import type { Vehicle, VehicleStatus } from "@/shared/types";

export default function VehiclesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string>("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Parse query params
  const query = {
    search: searchParams.get("search") || "",
    status: (searchParams.get("status") || "") as VehicleStatus,
    type: searchParams.get("type") || "",
    region: searchParams.get("region") || "",
    sort: searchParams.get("sort") || "-createdAt",
    page: parseInt(searchParams.get("page") || "1"),
    limit: parseInt(searchParams.get("limit") || "20"),
  };

  // Fetch vehicles
  const fetchVehicles = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.get("/vehicles", {
        params: {
          search: query.search || undefined,
          status: query.status || undefined,
          type: query.type || undefined,
          region: query.region || undefined,
          sort: query.sort,
          page: query.page,
          limit: query.limit,
        },
      });
      setVehicles(result.data);
      setMeta(result.meta);
    } catch (err: any) {
      setError(err.message || "Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [searchParams]);

  // Subscribe to vehicle updates
  useEffect(() => {
    socket.on(SOCKET_EVENTS.VEHICLE_UPDATED, (updated: Vehicle) => {
      setVehicles((prev) =>
        prev.map((v) => (v.id === updated.id ? updated : v))
      );
    });
    return () => {
      socket.off(SOCKET_EVENTS.VEHICLE_UPDATED);
    };
  }, []);

  const updateQueryParam = (key: string, value: string | number | null) => {
    const params = new URLSearchParams(searchParams);
    if (value === null || value === "") {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
    params.set("page", "1"); // Reset to page 1 on filter change
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
        <h1 className="text-3xl font-bold">Vehicles</h1>
        <button
          onClick={() => {
            setEditingId("");
            setShowForm(true);
            setFormErrors({});
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Add Vehicle
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Search name or registration..."
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
            <option value="IN_SHOP">In Shop</option>
            <option value="RETIRED">Retired</option>
          </select>
          <input
            type="text"
            placeholder="Type..."
            value={query.type}
            onChange={(e) => updateQueryParam("type", e.target.value)}
            className="px-3 py-2 border rounded"
          />
          <input
            type="text"
            placeholder="Region..."
            value={query.region}
            onChange={(e) => updateQueryParam("region", e.target.value)}
            className="px-3 py-2 border rounded"
          />
          <select
            value={query.sort}
            onChange={(e) => updateQueryParam("sort", e.target.value)}
            className="px-3 py-2 border rounded"
          >
            <option value="name">Name (A-Z)</option>
            <option value="-name">Name (Z-A)</option>
            <option value="-createdAt">Newest</option>
            <option value="createdAt">Oldest</option>
            <option value="odometerKm">Odometer (Low)</option>
            <option value="-odometerKm">Odometer (High)</option>
          </select>
        </div>
      </div>

      {error && <div className="bg-red-100 text-red-800 p-3 rounded mb-4">{error}</div>}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-4 py-2 text-left cursor-pointer hover:bg-gray-200" onClick={() => toggleSort("registrationNumber")}>
                Registration #
              </th>
              <th className="border px-4 py-2 text-left cursor-pointer hover:bg-gray-200" onClick={() => toggleSort("name")}>
                Name
              </th>
              <th className="border px-4 py-2 text-left">Type</th>
              <th className="border px-4 py-2 text-left">Capacity (kg)</th>
              <th className="border px-4 py-2 text-left">Odometer (km)</th>
              <th className="border px-4 py-2 text-left">Status</th>
              <th className="border px-4 py-2 text-left">Region</th>
              <th className="border px-4 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="border px-4 py-4 text-center">Loading...</td>
              </tr>
            ) : vehicles.length === 0 ? (
              <tr>
                <td colSpan={8} className="border px-4 py-4 text-center text-gray-500">No vehicles found</td>
              </tr>
            ) : (
              vehicles.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="border px-4 py-2 font-mono">{v.registrationNumber}</td>
                  <td className="border px-4 py-2">{v.name}</td>
                  <td className="border px-4 py-2">{v.type}</td>
                  <td className="border px-4 py-2">{v.maxLoadCapacityKg}</td>
                  <td className="border px-4 py-2">{v.odometerKm}</td>
                  <td className="border px-4 py-2">
                    <StatusBadge status={v.status} />
                  </td>
                  <td className="border px-4 py-2">{v.region || "—"}</td>
                  <td className="border px-4 py-2 text-center">
                    <button
                      onClick={() => {
                        setEditingId(v.id);
                        setShowForm(true);
                        setFormErrors({});
                      }}
                      className="text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
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
        <VehicleFormModal
          vehicleId={editingId}
          onClose={() => setShowForm(false)}
          onSave={() => {
            setShowForm(false);
            fetchVehicles();
          }}
          onErrors={setFormErrors}
          errors={formErrors}
        />
      )}
    </div>
  );
}

function VehicleFormModal({
  vehicleId,
  onClose,
  onSave,
  onErrors,
  errors,
}: {
  vehicleId: string;
  onClose: () => void;
  onSave: () => void;
  onErrors: (err: Record<string, string>) => void;
  errors: Record<string, string>;
}) {
  const [vehicle, setVehicle] = useState<Partial<Vehicle>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (vehicleId) {
      api.get(`/vehicles/${vehicleId}`).then(setVehicle).catch(console.error);
    }
  }, [vehicleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    onErrors({});

    try {
      if (vehicleId) {
        // Edit — exclude registrationNumber
        const { registrationNumber, ...updateData } = vehicle;
        await api.patch(`/vehicles/${vehicleId}`, updateData);
      } else {
        // Create
        await api.post("/vehicles", vehicle);
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">
          {vehicleId ? "Edit Vehicle" : "Add Vehicle"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          {!vehicleId && (
            <div>
              <label className="block text-sm font-medium mb-1">Registration Number</label>
              <input
                type="text"
                value={vehicle.registrationNumber || ""}
                onChange={(e) => setVehicle({ ...vehicle, registrationNumber: e.target.value })}
                className={`w-full px-3 py-2 border rounded ${errors.registrationNumber ? "border-red-500" : ""}`}
                required
              />
              {errors.registrationNumber && <p className="text-red-600 text-sm">{errors.registrationNumber}</p>}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={vehicle.name || ""}
              onChange={(e) => setVehicle({ ...vehicle, name: e.target.value })}
              className={`w-full px-3 py-2 border rounded ${errors.name ? "border-red-500" : ""}`}
              required
            />
            {errors.name && <p className="text-red-600 text-sm">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <input
              type="text"
              value={vehicle.type || ""}
              onChange={(e) => setVehicle({ ...vehicle, type: e.target.value })}
              className={`w-full px-3 py-2 border rounded ${errors.type ? "border-red-500" : ""}`}
              required
            />
            {errors.type && <p className="text-red-600 text-sm">{errors.type}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max Capacity (kg)</label>
            <input
              type="number"
              value={vehicle.maxLoadCapacityKg || ""}
              onChange={(e) => setVehicle({ ...vehicle, maxLoadCapacityKg: parseFloat(e.target.value) })}
              className={`w-full px-3 py-2 border rounded ${errors.maxLoadCapacityKg ? "border-red-500" : ""}`}
              required
            />
            {errors.maxLoadCapacityKg && <p className="text-red-600 text-sm">{errors.maxLoadCapacityKg}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Acquisition Cost</label>
            <input
              type="number"
              value={vehicle.acquisitionCost || ""}
              onChange={(e) => setVehicle({ ...vehicle, acquisitionCost: parseFloat(e.target.value) })}
              className={`w-full px-3 py-2 border rounded ${errors.acquisitionCost ? "border-red-500" : ""}`}
              required
            />
            {errors.acquisitionCost && <p className="text-red-600 text-sm">{errors.acquisitionCost}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Region (optional)</label>
            <input
              type="text"
              value={vehicle.region || ""}
              onChange={(e) => setVehicle({ ...vehicle, region: e.target.value })}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          {vehicleId && (
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={vehicle.status || "AVAILABLE"}
                onChange={(e) => setVehicle({ ...vehicle, status: e.target.value as VehicleStatus })}
                className={`w-full px-3 py-2 border rounded ${errors.status ? "border-red-500" : ""}`}
              >
                <option value="AVAILABLE">Available</option>
                <option value="IN_SHOP">In Shop</option>
                <option value="RETIRED">Retired</option>
              </select>
              {errors.status && <p className="text-red-600 text-sm">{errors.status}</p>}
            </div>
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
