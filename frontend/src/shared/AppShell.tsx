// File: frontend/src/shared/AppShell.tsx
import { Link, useLocation, Outlet } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "./AuthContext";

export function AppShell() {
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
    <div className="min-h-screen bg-gray-50 flex flex-col relative overflow-hidden">
      {/* Subtle background element */}
      <div className="pointer-events-none absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-indigo-100/50 to-transparent" />

      <nav className="glass-nav sticky top-0 z-40 px-6 py-4 flex flex-wrap gap-8 text-sm font-medium text-gray-600 items-center">
        <div className="font-heading font-bold text-xl tracking-tight text-gray-900 mr-2">
          Transit<span className="text-gradient">Ops</span>
        </div>
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`relative pb-1 transition-colors hover:text-indigo-600 ${
              location.pathname === item.path ? "text-indigo-600 font-semibold" : ""
            }`}
          >
            {item.name}
            {location.pathname === item.path && (
              <motion.div layoutId="nav-underline" className="absolute -bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
            )}
          </Link>
        ))}
        <div className="ml-auto flex items-center gap-4">
          {user ? (
            <>
              <div className="flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-full border border-gray-200/60 shadow-sm">
                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs font-bold">
                  {user.name.charAt(0)}
                </span>
                <span className="text-gray-700 text-xs font-medium">{user.name}</span>
                <span className="text-gray-400 text-[10px] uppercase tracking-wider hidden sm:inline-block border-l border-gray-300 pl-2 ml-1">
                  {user.role.replace(/_/g, " ")}
                </span>
              </div>
              <button onClick={logout} className="text-gray-500 hover:text-red-600 transition-colors text-sm font-medium ml-2">
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="text-indigo-600 font-medium">Login</Link>
          )}
        </div>
      </nav>
      <main className="flex-1 relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
