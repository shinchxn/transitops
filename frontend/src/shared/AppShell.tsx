// File: frontend/src/shared/AppShell.tsx
import React from "react";
import { Link, useLocation, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
      <nav className="bg-navy-900 border-b border-navy-600 px-6 py-4 flex flex-wrap gap-6 text-sm font-medium text-gray-300 items-center sticky top-0 z-40 shadow-lg shadow-black/20">
        <div className="font-extrabold text-lg mr-4 tracking-tight">
          <span className="text-white">Transit</span>
          <span className="text-brand-400">Ops</span>
        </div>
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`relative pb-1 transition-colors hover:text-brand-300 ${
              location.pathname === item.path ? "text-white font-semibold" : ""
            }`}
          >
            {item.name}
            {location.pathname === item.path && (
              <motion.div layoutId="nav-underline" className="absolute -bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-full" />
            )}
          </Link>
        ))}
        <div className="ml-auto flex items-center gap-4">
          {user ? (
            <>
              <span className="text-gray-400 text-xs">{user.name} ({user.role.replace(/_/g, " ")})</span>
              <button onClick={logout} className="text-gray-400 hover:text-brand-300 transition-colors">
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="text-brand-400">Login</Link>
          )}
        </div>
      </nav>
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
