// File: frontend/src/App.tsx
// Root application component — wires React Router, AuthProvider, and
// protected routes behind AppShell. Agents B/C/D's pages plug in as
// children of the protected layout route; nobody needs to touch this
// file to add a page — just add the Route line if you add a brand-new
// top-level page (rare; most work happens inside existing pages).
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./shared/AuthContext";
import { RequireAuth } from "./shared/RequireAuth";
import { AppShell } from "./shared/AppShell";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import VehiclesPage from "./pages/VehiclesPage";
import DriversPage from "./pages/DriversPage";
import TripsPage from "./pages/TripsPage";
import MaintenancePage from "./pages/MaintenancePage";
import FuelPage from "./pages/FuelPage";
import ReportsPage from "./pages/ReportsPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/vehicles" element={<VehiclesPage />} />
            <Route path="/drivers" element={<DriversPage />} />
            <Route path="/trips" element={<TripsPage />} />
            <Route path="/maintenance" element={<MaintenancePage />} />
            <Route path="/fuel" element={<FuelPage />} />
            <Route
              path="/reports"
              element={
                <RequireAuth roles={["FINANCIAL_ANALYST", "FLEET_MANAGER"]}>
                  <ReportsPage />
                </RequireAuth>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
