// File: frontend/src/shared/colors.ts
// The color contract Agents B/C/D must reuse rather than reinvent — one
// status badge look across Vehicles/Drivers/Trips pages.
import React from "react";

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-800",
  ON_TRIP: "bg-amber-100 text-amber-800",
  IN_SHOP: "bg-purple-100 text-purple-800",
  SUSPENDED: "bg-red-100 text-red-800",
  RETIRED: "bg-gray-200 text-gray-600",
  OFF_DUTY: "bg-gray-100 text-gray-600",
  DRAFT: "bg-gray-100 text-gray-600",
  DISPATCHED: "bg-amber-100 text-amber-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  OPEN: "bg-orange-100 text-orange-800",
  CLOSED: "bg-blue-100 text-blue-800",
};

const FALLBACK_COLOR = "bg-gray-100 text-gray-800";

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
