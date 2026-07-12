// File: frontend/src/shared/AppShell.tsx
import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { Role } from "./types";

const THEME_KEY = "transitops-theme";

const NAV_ITEMS: { path: string; label: string; roles?: Role[] }[] = [
  { path: "/dashboard", label: "Dashboard" },
  { path: "/vehicles", label: "Vehicles" },
  { path: "/drivers", label: "Drivers" },
  { path: "/trips", label: "Trips" },
  { path: "/maintenance", label: "Maintenance" },
  { path: "/fuel", label: "Fuel" },
  { path: "/reports", label: "Reports", roles: ["FINANCIAL_ANALYST", "FLEET_MANAGER"] },
];

function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored) return stored === "dark";
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  }, [isDark]);

  return { isDark, toggle: () => setIsDark((d) => !d) };
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const items = NAV_ITEMS.filter((item) => !item.roles || (user && item.roles.includes(user.role)));

  return (
    <nav className="flex flex-col gap-1 p-3">
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          onClick={onNavigate}
          className={({ isActive }) =>
            `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function AppShell() {
  const { user, logout } = useAuth();
  const { isDark, toggle } = useDarkMode();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-950">
      {/* Topbar */}
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <button
            className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-800 md:hidden"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle navigation"
          >
            ☰
          </button>
          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">🚛 TransitOps</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="rounded-md p-2 text-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={toggle}
            aria-label="Toggle dark mode"
          >
            {isDark ? "☀️" : "🌙"}
          </button>
          {user && (
            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-gray-600 dark:text-gray-300 sm:inline">
                {user.name} · {user.role.replace(/_/g, " ")}
              </span>
              <button
                onClick={() => logout()}
                className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden w-56 shrink-0 border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 md:block">
          <SidebarNav />
        </aside>

        {/* Mobile drawer overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <aside className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl dark:bg-gray-900">
              <SidebarNav onNavigate={() => setMobileOpen(false)} />
            </aside>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
