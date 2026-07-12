// File: frontend/src/pages/FuelPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import { api, PaginatedResponse } from "../shared/api";
import { useAuth } from "../shared/AuthContext";

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

export default function FuelPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"fuel" | "expenses">("fuel");
  
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState<"fuel" | "expense" | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "fuel") {
        const res = await api.get<PaginatedResponse<FuelLog>>("/fuel-logs");
        setFuelLogs(res.data.data);
      } else {
        const res = await api.get<PaginatedResponse<Expense>>("/expenses");
        setExpenses(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const canAddFuel = user?.role === "DRIVER" || user?.role === "FLEET_MANAGER";
  const canAddExpense = user?.role === "FLEET_MANAGER" || user?.role === "FINANCIAL_ANALYST";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fuel & Expenses</h1>
          <p className="text-sm text-gray-500">Track fuel logs and operational expenses</p>
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
          <button onClick={() => setActiveTab("fuel")} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === "fuel" ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}>
            Fuel Logs
          </button>
          <button onClick={() => setActiveTab("expenses")} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === "expenses" ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}>
            Expenses
          </button>
        </nav>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        {activeTab === "fuel" ? (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-500">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-500">Vehicle ID</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-500">Liters</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-500">Cost ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (<tr><td colSpan={4} className="p-4 text-center">Loading...</td></tr>) : 
               fuelLogs.map(l => (
                <tr key={l.id}>
                  <td className="px-4 py-3">{new Date(l.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-mono text-xs">{l.vehicleId}</td>
                  <td className="px-4 py-3">{l.liters}</td>
                  <td className="px-4 py-3">{l.cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-500">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-500">Vehicle ID</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-500">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-500">Amount ($)</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-500">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (<tr><td colSpan={5} className="p-4 text-center">Loading...</td></tr>) : 
               expenses.map(e => (
                <tr key={e.id}>
                  <td className="px-4 py-3">{new Date(e.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-mono text-xs">{e.vehicleId}</td>
                  <td className="px-4 py-3">{e.type}</td>
                  <td className="px-4 py-3">{e.amount}</td>
                  <td className="px-4 py-3 text-gray-500">{e.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen === "fuel" && <FuelModal onClose={() => setModalOpen(null)} onSuccess={() => { setModalOpen(null); fetchData(); }} />}
      {modalOpen === "expense" && <ExpenseModal onClose={() => setModalOpen(null)} onSuccess={() => { setModalOpen(null); fetchData(); }} />}
    </div>
  );
}

function FuelModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [form, setForm] = useState({ vehicleId: "", liters: "", cost: "" });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/fuel-logs", { ...form, liters: Number(form.liters), cost: Number(form.cost) });
      onSuccess();
    } catch (err: any) {
      alert(err.response?.data?.message || "Error saving fuel log");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Log Fuel</h2>
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div><label className="block mb-1">Vehicle ID</label><input required value={form.vehicleId} onChange={e => setForm({...form, vehicleId: e.target.value})} className="w-full border rounded px-3 py-2" /></div>
          <div><label className="block mb-1">Liters</label><input type="number" required value={form.liters} onChange={e => setForm({...form, liters: e.target.value})} className="w-full border rounded px-3 py-2" /></div>
          <div><label className="block mb-1">Cost ($)</label><input type="number" required value={form.cost} onChange={e => setForm({...form, cost: e.target.value})} className="w-full border rounded px-3 py-2" /></div>
          <div className="flex justify-end gap-2 pt-4"><button type="button" onClick={onClose} className="px-4 py-2 border rounded">Cancel</button><button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white rounded">Save</button></div>
        </form>
      </div>
    </div>
  );
}

function ExpenseModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [form, setForm] = useState({ vehicleId: "", type: "TOLL", amount: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/expenses", { ...form, amount: Number(form.amount) });
      onSuccess();
    } catch (err: any) {
      alert(err.response?.data?.message || "Error saving expense");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Add Expense</h2>
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div><label className="block mb-1">Vehicle ID</label><input required value={form.vehicleId} onChange={e => setForm({...form, vehicleId: e.target.value})} className="w-full border rounded px-3 py-2" /></div>
          <div>
            <label className="block mb-1">Type</label>
            <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full border rounded px-3 py-2">
              <option value="TOLL">Toll</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div><label className="block mb-1">Amount ($)</label><input type="number" required value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full border rounded px-3 py-2" /></div>
          <div><label className="block mb-1">Notes</label><textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full border rounded px-3 py-2" rows={2}></textarea></div>
          <div className="flex justify-end gap-2 pt-4"><button type="button" onClick={onClose} className="px-4 py-2 border rounded">Cancel</button><button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white rounded">Save</button></div>
        </form>
      </div>
    </div>
  );
}
