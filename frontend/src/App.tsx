// File: frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./shared/AuthContext";
import { AppShell, RequireAuth } from "./shared/AppShell";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import TripsPage from "./pages/TripsPage";
import VehiclesPage from "./pages/VehiclesPage";
import DriversPage from "./pages/DriversPage";
import MaintenancePage from "./pages/MaintenancePage";
import FuelPage from "./pages/FuelPage";
import ReportsPage from "./pages/ReportsPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route path="/" element={<RequireAuth><AppShell><DashboardPage /></AppShell></RequireAuth>} />
          <Route path="/trips" element={<RequireAuth><AppShell><TripsPage /></AppShell></RequireAuth>} />
          
          {/* Agent B */}
          <Route path="/vehicles" element={<RequireAuth><AppShell><VehiclesPage /></AppShell></RequireAuth>} />
          <Route path="/drivers" element={<RequireAuth><AppShell><DriversPage /></AppShell></RequireAuth>} />
          
          {/* Agent D */}
          <Route path="/maintenance" element={<RequireAuth><AppShell><MaintenancePage /></AppShell></RequireAuth>} />
          <Route path="/fuel" element={<RequireAuth><AppShell><FuelPage /></AppShell></RequireAuth>} />
          <Route path="/reports" element={<RequireAuth><AppShell><ReportsPage /></AppShell></RequireAuth>} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
