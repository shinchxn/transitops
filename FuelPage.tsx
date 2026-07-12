// frontend/src/pages/FuelPage.tsx
import { useEffect, useState, useCallback } from "react";
import { apiClient } from "../shared/apiClient";
import { useAuth } from "../shared/AuthContext";

interface Vehicle {
  id: string;
  registrationNumber: string;
  name: string;
}

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
  type: "TOLL" | "MAINTENANCE" | "OTHER";
  amount: number;
  date: string;
  notes: string | null;
}

export default function FuelPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"fuel" | "expenses">("fuel");
  const [vehicles, setVehicles] = useState<Record<string, Vehicle>>({});
  const [vehicleFilter, setVehicleFilter] = useState("");

  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const [fVehicleId, setFVehicleId] = useState("");
  const [fLiters, setFLiters] = useState("");
  const [fCost, setFCost] = useState("");
  const [eVehicleId, setEVehicleId] = useState("");
  const [eType, setEType] = useState<"TOLL" | "MAINTENANCE" | "OTHER">("TOLL");
  const [eAmount, setEAmount] = useState("");
  const [eNotes, setENotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const canLogFuel = user?.role === "DRIVER" || user?.role === "FLEET_MANAGER";
  const canLogExpense = user?.role === "FLEET_MANAGER" || user?.role === "FINANCIAL_ANALYST";

  const loadVehicles = useCallback(async () => {
    const res = await apiClient.get("/vehicles");
    const map: Record<string, Vehicle> = {};
    for (const v of res.data as Vehicle[]) map[v.id] = v;
    setVehicles(map);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = vehicleFilter ? { vehicleId: vehicleFilter } : {};
      if (tab === "fuel") {
        const res = await apiClient.get("/fuel-logs", { params });
        setFuelLogs(res.data.items);
      } else {
        const res = await apiClient.get("/expenses", { params });
        setExpenses(res.data.items);
      }
    } finally {
      setLoading(false);
    }
  }, [tab, vehicleFilter]);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleFuelSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!fVehicleId || !fLiters || !fCost) {
      setFormError("Vehicle, liters, and cost are required.");
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post("/fuel-logs", {
        vehicleId: fVehicleId,
        liters: Number(fLiters),
        cost: Number(fCost),
      });
      setFVehicleId("");
      setFLiters("");
      setFCost("");
      await loadData();
    } catch (err: any) {
      setFormError(err?.response?.data?.message ?? "Couldn't save the fuel log.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleExpenseSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!eVehicleId || !eAmount) {
      setFormError("Vehicle and amount are required.");
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post("/expenses", {
        vehicleId: eVehicleId,
        type: eType,
        amount: Number(eAmount),
        notes: eNotes.trim() || undefined,
      });
      setEVehicleId("");
      setEAmount("");
      setENotes("");
      await loadData();
    } catch (err: any) {
      setFormError(err?.response?.data?.message ?? "Couldn't save the expense.");
    } finally {
      setSubmitting(false);
    }
  }

  const vehicleLabel = (id: string) =>
    vehicles[id] ? `${vehicles[id].registrationNumber} — ${vehicles[id].name}` : id;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Fuel & Expenses</h1>
        <select
          value={vehicleFilter}
          onChange={(e) => setVehicleFilter(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm"
        >
          <option value="">All vehicles</option>
          {Object.values(vehicles).map((v) => (
            <option key={v.id} value={v.id}>
              {v.registrationNumber} — {v.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2 border-b">
        <button
          onClick={() => setTab("fuel")}
          className={`px-3 py-2 text-sm border-b-2 ${
            tab === "fuel" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"
          }`}
        >
          Fuel Logs
        </button>
        <button
          onClick={() => setTab("expenses")}
          className={`px-3 py-2 text-sm border-b-2 ${
            tab === "expenses"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500"
          }`}
        >
          Expenses
        </button>
      </div>

      {tab === "fuel" && canLogFuel && (
        <form
          onSubmit={handleFuelSubmit}
          className="border rounded-lg p-4 space-y-3 bg-gray-50 dark:bg-gray-900"
        >
          <h2 className="text-sm font-medium">Log fuel</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={fVehicleId}
              onChange={(e) => setFVehicleId(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            >
              <option value="">Select vehicle</option>
              {Object.values(vehicles).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registrationNumber} — {v.name}
                </option>
              ))}
            </select>
            <input
              value={fLiters}
              onChange={(e) => setFLiters(e.target.value)}
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Liters"
              className="border rounded px-3 py-2 text-sm"
            />
            <input
              value={fCost}
              onChange={(e) => setFCost(e.target.value)}
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
            {submitting ? "Saving…" : "Add fuel log"}
          </button>
        </form>
      )}

      {tab === "expenses" && canLogExpense && (
        <form
          onSubmit={handleExpenseSubmit}
          className="border rounded-lg p-4 space-y-3 bg-gray-50 dark:bg-gray-900"
        >
          <h2 className="text-sm font-medium">Log an expense</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <select
              value={eVehicleId}
              onChange={(e) => setEVehicleId(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            >
              <option value="">Select vehicle</option>
              {Object.values(vehicles).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registrationNumber} — {v.name}
                </option>
              ))}
            </select>
            <select
              value={eType}
              onChange={(e) => setEType(e.target.value as typeof eType)}
              className="border rounded px-3 py-2 text-sm"
            >
              <option value="TOLL">Toll</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="OTHER">Other</option>
            </select>
            <input
              value={eAmount}
              onChange={(e) => setEAmount(e.target.value)}
              type="number"
              min="0"
              step="0.01"
              placeholder="Amount"
              className="border rounded px-3 py-2 text-sm"
            />
            <input
              value={eNotes}
              onChange={(e) => setENotes(e.target.value)}
              placeholder="Notes (optional)"
              maxLength={300}
              className="border rounded px-3 py-2 text-sm"
            />
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-sm rounded bg-blue-600 text-white disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Add expense"}
          </button>
        </form>
      )}

      <div className="border rounded-lg overflow-hidden">
        {tab === "fuel" ? (
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800 text-left">
              <tr>
                <th className="px-3 py-2">Vehicle</th>
                <th className="px-3 py-2">Liters</th>
                <th className="px-3 py-2">Cost</th>
                <th className="px-3 py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-gray-500">
                    Loading…
                  </td>
                </tr>
              ) : fuelLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-gray-500">
                    No fuel logs yet.
                  </td>
                </tr>
              ) : (
                fuelLogs.map((log) => (
                  <tr key={log.id} className="border-t">
                    <td className="px-3 py-2">{vehicleLabel(log.vehicleId)}</td>
                    <td className="px-3 py-2">{log.liters.toFixed(1)} L</td>
                    <td className="px-3 py-2">₹{log.cost.toFixed(2)}</td>
                    <td className="px-3 py-2">{new Date(log.date).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800 text-left">
              <tr>
                <th className="px-3 py-2">Vehicle</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Notes</th>
                <th className="px-3 py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                    Loading…
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                    No expenses yet.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="border-t">
                    <td className="px-3 py-2">{vehicleLabel(exp.vehicleId)}</td>
                    <td className="px-3 py-2">{exp.type}</td>
                    <td className="px-3 py-2">₹{exp.amount.toFixed(2)}</td>
                    <td className="px-3 py-2">{exp.notes ?? "—"}</td>
                    <td className="px-3 py-2">{new Date(exp.date).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
