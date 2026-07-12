// File: frontend/src/shared/AppShell.tsx
import React from "react";
import { Link, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function RequireAuth({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8">Loading session...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <div className="p-8 text-red-600">Access Denied: Your role ({user.role}) is not authorised for this page.</div>;
  }
  return <>{children}</>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: "Dashboard", path: "/" },
    { name: "Trips", path: "/trips" },
    { name: "Vehicles", path: "/vehicles" },
    { name: "Drivers", path: "/drivers" },
    { name: "Maintenance", path: "/maintenance" },
    { name: "Fuel & Expenses", path: "/fuel" },
    { name: "Reports", path: "/reports" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex flex-wrap gap-6 text-sm font-medium text-gray-600 items-center">
        <div className="text-indigo-700 font-bold text-lg mr-4">TransitOps</div>
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`hover:text-indigo-600 transition-colors ${
              location.pathname === item.path ? "text-indigo-600 font-semibold border-b-2 border-indigo-600 pb-1" : ""
            }`}
          >
            {item.name}
          </Link>
        ))}
        <div className="ml-auto flex items-center gap-4">
          {user ? (
            <>
              <span className="text-gray-500 text-xs">{user.name} ({user.role.replace(/_/g, " ")})</span>
              <button onClick={logout} className="text-gray-400 hover:text-gray-700">Logout</button>
            </>
          ) : (
            <Link to="/login" className="text-indigo-600">Login</Link>
          )}
        </div>
      </nav>
      <main className="flex-1">{children}</main>
    </div>
  );
}
