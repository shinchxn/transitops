// File: frontend/src/shared/colors.ts
// The color contract Agents B/C/D must reuse rather than reinvent — one
// status badge look across Vehicles/Drivers/Trips pages.
import React from "react";

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  ON_TRIP: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  IN_SHOP: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  SUSPENDED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  RETIRED: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  OFF_DUTY: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  DISPATCHED: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  OPEN: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  CLOSED: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
};

const FALLBACK_COLOR = "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? FALLBACK_COLOR;
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const colorClass = getStatusColor(status);
  return React.createElement(
    "span",
    { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}` },
    label || status.replace(/_/g, " ")
  );
}
