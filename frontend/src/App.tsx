// File: frontend/src/App.tsx
// Root application component.
// Agent A (Phase 1) wires up React Router, auth context, and protected routes here.

import { BrowserRouter, Routes, Route } from "react-router-dom";

// Page placeholders — Agents B/C/D replace with real implementations
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import VehiclesPage from "@/pages/VehiclesPage";
import DriversPage from "@/pages/DriversPage";
import TripsPage from "@/pages/TripsPage";
import MaintenancePage from "@/pages/MaintenancePage";
import FuelPage from "@/pages/FuelPage";
import ReportsPage from "@/pages/ReportsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<DashboardPage />} />
        <Route path="/vehicles" element={<VehiclesPage />} />
        <Route path="/drivers" element={<DriversPage />} />
        <Route path="/trips" element={<TripsPage />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/fuel" element={<FuelPage />} />
        <Route path="/reports" element={<ReportsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
