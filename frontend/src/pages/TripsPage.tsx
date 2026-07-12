// File: frontend/src/pages/TripsPage.tsx
// Owner: Agent C — Trip Management & Dispatch UI
//
// Component hierarchy:
//   TripsPage
//   ├── CreateTripForm      (modal — live capacity check before submit)
//   ├── DispatchConfirmModal  (confirm + error rendering per error code)
//   ├── CompleteTripModal    (form: actualDistanceKm + fuelConsumedLtr)
//   └── CancelConfirmModal   (confirm + error rendering)
//
// Socket.IO subscription patches rows live so a dispatch in Tab 1 appears
// in Tab 2 without a manual refresh.

import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { io, Socket } from "socket.io-client";

// ─── Types ────────────────────────────────────────────────────────────────────

type TripStatus = "DRAFT" | "DISPATCHED" | "COMPLETED" | "CANCELLED";
type VehicleStatus = "AVAILABLE" | "ON_TRIP" | "IN_SHOP" | "RETIRED";
type DriverStatus = "AVAILABLE" | "ON_TRIP" | "OFF_DUTY" | "SUSPENDED";

interface Trip {
  id: string;
  source: string;
  destination: string;
  cargoWeightKg: number;
  plannedDistanceKm: number;
  actualDistanceKm: number | null;
  fuelConsumedLtr: number | null;
  status: TripStatus;
  vehicleId: string;
  driverId: string;
  createdById: string;
  dispatchedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
}

interface Vehicle {
  id: string;
  registrationNumber: string;
  name: string;
  type: string;
  maxLoadCapacityKg: number;
  odometerKm: number;
  status: VehicleStatus;
}

interface Driver {
  id: string;
  name: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiryDate: string;
  status: DriverStatus;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

interface ApiError {
  error: string;
  message: string;
}

// ─── Trip status colour map ───────────────────────────────────────────────────
// Extends Agent A/B's status colour convention for trip-specific statuses.

function tripStatusBadge(status: TripStatus) {
  const map: Record<TripStatus, { bg: string; text: string; label: string }> = {
    DRAFT: { bg: "bg-gray-100", text: "text-gray-700", label: "Draft" },
    DISPATCHED: { bg: "bg-amber-100", text: "text-amber-800", label: "Dispatched" },
    COMPLETED: { bg: "bg-green-100", text: "text-green-800", label: "Completed" },
    CANCELLED: { bg: "bg-red-100", text: "text-red-800", label: "Cancelled" },
  };
  const s = map[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}
    >
      {s.label}
    </span>
  );
}

// Error code → user-friendly icon hint
function errorIcon(code: string): string {
  if (code === "CARGO_OVERWEIGHT") return "⚠️";
  if (code.includes("UNAVAILABLE") || code.includes("SUSPENDED")) return "🔒";
  if (code === "DRIVER_LICENSE_EXPIRED") return "📋";
  if (code === "INVALID_TRIP_STATE") return "🔄";
  return "❌";
}

// ─── API helpers ──────────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

// ─── Custom hooks ─────────────────────────────────────────────────────────────

function useTrips(query: {
  status?: TripStatus;
  page: number;
  limit: number;
}) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1, limit: 20 });
  const [loading, setLoading] = useState(false);

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page: query.page,
        limit: query.limit,
        sort: "-createdAt",
      };
      if (query.status) params["status"] = query.status;

      const { data } = await api.get<PaginatedResponse<Trip>>("/trips", { params });
      setTrips(data.data);
      setMeta(data.meta);
    } catch (err) {
      console.error("Failed to fetch trips", err);
    } finally {
      setLoading(false);
    }
  }, [query.status, query.page, query.limit]);

  // Patch a single row in-place (used by socket events).
  const patchTrip = useCallback((updatedTrip: Trip) => {
    setTrips((prev) =>
      prev.map((t) => (t.id === updatedTrip.id ? updatedTrip : t))
    );
  }, []);

  // Prepend a new trip (used by TRIP_CREATED socket event).
  const prependTrip = useCallback((newTrip: Trip) => {
    setTrips((prev) => [newTrip, ...prev]);
  }, []);

  return { trips, meta, loading, fetchTrips, patchTrip, prependTrip };
}

function useAvailableVehicles(open: boolean) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  useEffect(() => {
    if (!open) return;
    api
      .get<PaginatedResponse<Vehicle>>("/vehicles", {
        params: { status: "AVAILABLE", limit: 100 },
      })
      .then(({ data }) => setVehicles(data.data))
      .catch(console.error);
  }, [open]);
  return vehicles;
}

function useAvailableDrivers(open: boolean) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  useEffect(() => {
    if (!open) return;
    api
      .get<PaginatedResponse<Driver>>("/drivers", {
        params: { status: "AVAILABLE", limit: 100 },
      })
      .then(({ data }) => {
        const now = new Date().toISOString();
        setDrivers(data.data.filter((d) => d.licenseExpiryDate > now));
      })
      .catch(console.error);
  }, [open]);
  return drivers;
}

// ─── CreateTripForm ───────────────────────────────────────────────────────────

interface CreateTripFormProps {
  onCreated: () => void;
  onClose: () => void;
}

function CreateTripForm({ onCreated, onClose }: CreateTripFormProps) {
  const vehicles = useAvailableVehicles(true);
  const drivers = useAvailableDrivers(true);

  const [form, setForm] = useState({
    source: "",
    destination: "",
    cargoWeightKg: "",
    plannedDistanceKm: "",
    vehicleId: "",
    driverId: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<ApiError | null>(null);

  // Live capacity check — runs purely on already-fetched vehicle data.
  // No network round-trip required: the vehicle list already contains maxLoadCapacityKg.
  const selectedVehicle = vehicles.find((v) => v.id === form.vehicleId);
  const cargo = parseFloat(form.cargoWeightKg);
  const capacityWarning =
    selectedVehicle && !isNaN(cargo) && cargo > selectedVehicle.maxLoadCapacityKg
      ? `Exceeds ${selectedVehicle.name}'s ${selectedVehicle.maxLoadCapacityKg}kg capacity by ${(cargo - selectedVehicle.maxLoadCapacityKg).toFixed(1)}kg`
      : null;

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setServerError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (capacityWarning) return; // block submit if client already knows it's overweight
    setSubmitting(true);
    setServerError(null);
    try {
      await api.post("/trips", {
        source: form.source,
        destination: form.destination,
        cargoWeightKg: parseFloat(form.cargoWeightKg),
        plannedDistanceKm: parseFloat(form.plannedDistanceKm),
        vehicleId: form.vehicleId,
        driverId: form.driverId,
      });
      onCreated();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setServerError(err.response?.data as ApiError);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">New Trip</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {serverError && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            <span>{errorIcon(serverError.error)}</span>
            <span>{serverError.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Source
              </label>
              <input
                name="source"
                value={form.source}
                onChange={handleChange}
                required
                maxLength={150}
                placeholder="Warehouse A"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Destination
              </label>
              <input
                name="destination"
                value={form.destination}
                onChange={handleChange}
                required
                maxLength={150}
                placeholder="Depot B"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cargo Weight (kg)
              </label>
              <input
                name="cargoWeightKg"
                type="number"
                step="0.01"
                min="0.01"
                value={form.cargoWeightKg}
                onChange={handleChange}
                required
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  capacityWarning ? "border-orange-400" : "border-gray-300"
                }`}
              />
              {capacityWarning && (
                <p className="mt-1 text-xs text-orange-600 font-medium">
                  ⚠️ {capacityWarning}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Planned Distance (km)
              </label>
              <input
                name="plannedDistanceKm"
                type="number"
                step="0.01"
                min="0.01"
                value={form.plannedDistanceKm}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vehicle{" "}
              <span className="text-gray-400 font-normal">(available only)</span>
            </label>
            <select
              name="vehicleId"
              value={form.vehicleId}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select vehicle…</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.registrationNumber}) — max {v.maxLoadCapacityKg}kg
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Driver{" "}
              <span className="text-gray-400 font-normal">(available only)</span>
            </label>
            <select
              name="driverId"
              value={form.driverId}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select driver…</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} — License {d.licenseNumber}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !!capacityWarning}
              className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Creating…" : "Create Trip"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── DispatchConfirmModal ─────────────────────────────────────────────────────

interface DispatchConfirmModalProps {
  trip: Trip;
  onSuccess: (result: { trip: Trip }) => void;
  onClose: () => void;
}

function DispatchConfirmModal({ trip, onSuccess, onClose }: DispatchConfirmModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.patch<{ trip: Trip; vehicle: Vehicle; driver: Driver }>(
        `/trips/${trip.id}/dispatch`
      );
      onSuccess(data);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data as ApiError);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Dispatch Trip</h2>
        <p className="text-sm text-gray-600">
          Dispatch{" "}
          <strong>
            {trip.source} → {trip.destination}
          </strong>
          ? This will set the vehicle and driver to <em>On Trip</em>.
        </p>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            <span className="text-base">{errorIcon(error.error)}</span>
            <div>
              <p className="font-medium">{error.error.replace(/_/g, " ")}</p>
              {/* Server message rendered verbatim — not paraphrased */}
              <p className="mt-0.5">{error.message}</p>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !!error}
            className="flex-1 bg-amber-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Dispatching…" : "Dispatch"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CompleteTripModal ────────────────────────────────────────────────────────

interface CompleteTripModalProps {
  trip: Trip;
  onSuccess: (result: { trip: Trip }) => void;
  onClose: () => void;
}

function CompleteTripModal({ trip, onSuccess, onClose }: CompleteTripModalProps) {
  const [form, setForm] = useState({ actualDistanceKm: "", fuelConsumedLtr: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.patch<{ trip: Trip; vehicle: Vehicle; driver: Driver }>(
        `/trips/${trip.id}/complete`,
        {
          actualDistanceKm: parseFloat(form.actualDistanceKm),
          fuelConsumedLtr: parseFloat(form.fuelConsumedLtr),
        }
      );
      onSuccess(data);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data as ApiError);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Complete Trip</h2>
        <p className="text-sm text-gray-600">
          Enter the final odometer reading and fuel used for{" "}
          <strong>
            {trip.source} → {trip.destination}
          </strong>
          .
        </p>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            <span className="text-base">{errorIcon(error.error)}</span>
            <div>
              <p className="font-medium">{error.error.replace(/_/g, " ")}</p>
              <p className="mt-0.5">{error.message}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Actual Distance (km)
            </label>
            <input
              name="actualDistanceKm"
              type="number"
              step="0.01"
              min="0.01"
              value={form.actualDistanceKm}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fuel Consumed (litres)
            </label>
            <input
              name="fuelConsumedLtr"
              type="number"
              step="0.01"
              min="0.01"
              value={form.fuelConsumedLtr}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Completing…" : "Complete Trip"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── CancelConfirmModal ───────────────────────────────────────────────────────

interface CancelConfirmModalProps {
  trip: Trip;
  onSuccess: (result: { trip: Trip }) => void;
  onClose: () => void;
}

function CancelConfirmModal({ trip, onSuccess, onClose }: CancelConfirmModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.patch<{ trip: Trip; vehicle: Vehicle; driver: Driver }>(
        `/trips/${trip.id}/cancel`
      );
      onSuccess(data);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data as ApiError);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 text-red-700">
          Cancel Trip
        </h2>
        <p className="text-sm text-gray-600">
          Are you sure you want to cancel{" "}
          <strong>
            {trip.source} → {trip.destination}
          </strong>
          ? The vehicle and driver will be restored to <em>Available</em>.
        </p>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            <span className="text-base">{errorIcon(error.error)}</span>
            <div>
              <p className="font-medium">{error.error.replace(/_/g, " ")}</p>
              <p className="mt-0.5">{error.message}</p>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 transition-colors"
          >
            Keep Trip
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Cancelling…" : "Cancel Trip"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TripTable ────────────────────────────────────────────────────────────────

interface TripTableProps {
  trips: Trip[];
  loading: boolean;
  onDispatch: (trip: Trip) => void;
  onComplete: (trip: Trip) => void;
  onCancel: (trip: Trip) => void;
}

function TripTable({ trips, loading, onDispatch, onComplete, onCancel }: TripTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <svg className="animate-spin h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Loading trips…
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-lg">No trips found.</p>
        <p className="text-sm mt-1">Create a new trip to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Route
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Cargo (kg)
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Planned km
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Created
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {trips.map((trip) => (
            <tr key={trip.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-900">
                {trip.source}{" "}
                <span className="text-gray-400 mx-1">→</span>{" "}
                {trip.destination}
              </td>
              <td className="px-4 py-3 text-gray-600">{trip.cargoWeightKg}</td>
              <td className="px-4 py-3 text-gray-600">{trip.plannedDistanceKm}</td>
              <td className="px-4 py-3">{tripStatusBadge(trip.status)}</td>
              <td className="px-4 py-3 text-gray-400 text-xs">
                {new Date(trip.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  {trip.status === "DRAFT" && (
                    <button
                      onClick={() => onDispatch(trip)}
                      className="px-3 py-1 text-xs bg-amber-100 text-amber-800 rounded-md hover:bg-amber-200 transition-colors font-medium"
                    >
                      Dispatch
                    </button>
                  )}
                  {trip.status === "DISPATCHED" && (
                    <>
                      <button
                        onClick={() => onComplete(trip)}
                        className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded-md hover:bg-green-200 transition-colors font-medium"
                      >
                        Complete
                      </button>
                      <button
                        onClick={() => onCancel(trip)}
                        className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors font-medium"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── TripsPage ────────────────────────────────────────────────────────────────

type Modal =
  | { type: "create" }
  | { type: "dispatch"; trip: Trip }
  | { type: "complete"; trip: Trip }
  | { type: "cancel"; trip: Trip }
  | null;

export default function TripsPage() {
  const [statusFilter, setStatusFilter] = useState<TripStatus | "">("");
  const [page, setPage] = useState(1);
  const { trips, meta, loading, fetchTrips, patchTrip, prependTrip } = useTrips({
    status: statusFilter || undefined,
    page,
    limit: 20,
  });
  const [modal, setModal] = useState<Modal>(null);

  // Socket.IO subscription — patches rows live without polling.
  const socketRef = useRef<Socket | null>(null);
  useEffect(() => {
    const socket = io("http://localhost:4000", { withCredentials: true });
    socketRef.current = socket;

    socket.on(
      "trip:created",
      (payload: { event: string; data: { trip: Trip } }) => {
        // Prepend the new trip if the current filter allows it.
        if (!statusFilter || payload.data.trip.status === statusFilter) {
          prependTrip(payload.data.trip);
        }
      }
    );

    const patchOnEvent = (payload: {
      event: string;
      data: { trip: Trip };
    }) => {
      patchTrip(payload.data.trip);
    };

    socket.on("trip:dispatched", patchOnEvent);
    socket.on("trip:completed", patchOnEvent);
    socket.on("trip:cancelled", patchOnEvent);

    return () => {
      socket.disconnect();
    };
  }, [statusFilter, patchTrip, prependTrip]);

  // Initial and filter-driven data load.
  useEffect(() => {
    void fetchTrips();
  }, [fetchTrips]);

  function handleModalSuccess(result: { trip: Trip }) {
    patchTrip(result.trip);
    setModal(null);
  }

  const statuses: Array<TripStatus | ""> = [
    "",
    "DRAFT",
    "DISPATCHED",
    "COMPLETED",
    "CANCELLED",
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Trip Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {meta.total} trip{meta.total !== 1 ? "s" : ""} total
            </p>
          </div>
          <button
            onClick={() => setModal({ type: "create" })}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <span className="text-lg leading-none">+</span>
            New Trip
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center gap-2 flex-wrap">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === s
                  ? "bg-indigo-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {s === "" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto px-6 pb-6">
        <TripTable
          trips={trips}
          loading={loading}
          onDispatch={(trip) => setModal({ type: "dispatch", trip })}
          onComplete={(trip) => setModal({ type: "complete", trip })}
          onCancel={(trip) => setModal({ type: "cancel", trip })}
        />

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
            <span>
              Page {meta.page} of {meta.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                ← Prev
              </button>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {modal?.type === "create" && (
        <CreateTripForm
          onCreated={() => {
            setModal(null);
            void fetchTrips();
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "dispatch" && (
        <DispatchConfirmModal
          trip={modal.trip}
          onSuccess={handleModalSuccess}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "complete" && (
        <CompleteTripModal
          trip={modal.trip}
          onSuccess={handleModalSuccess}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "cancel" && (
        <CancelConfirmModal
          trip={modal.trip}
          onSuccess={handleModalSuccess}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
