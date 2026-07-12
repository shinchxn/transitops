// File: frontend/src/shared/colors.ts
import React from "react";

export function getStatusColor(status: string) {
  const map: Record<string, { bg: string; text: string }> = {
    // Shared defaults
    AVAILABLE: { bg: "bg-green-100", text: "text-green-800" },
    ON_TRIP: { bg: "bg-amber-100", text: "text-amber-800" },
    IN_SHOP: { bg: "bg-purple-100", text: "text-purple-800" },
    RETIRED: { bg: "bg-gray-200", text: "text-gray-600" },
    OFF_DUTY: { bg: "bg-gray-100", text: "text-gray-600" },
    SUSPENDED: { bg: "bg-red-100", text: "text-red-800" },
    OPEN: { bg: "bg-orange-100", text: "text-orange-800" },
    CLOSED: { bg: "bg-blue-100", text: "text-blue-800" },
  };
  return map[status] ?? { bg: "bg-gray-100", text: "text-gray-800" };
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const { bg, text } = getStatusColor(status);
  return React.createElement(
    "span",
    { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} ${text}` },
    label || status.replace(/_/g, " ")
  );
}
