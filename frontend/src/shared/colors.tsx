// File: frontend/src/shared/colors.tsx
// Status color helpers — returns Tailwind classes based on status enum values.

import React from "react";
import type { VehicleStatus, DriverStatus } from "./types";

export const getStatusColor = (status: VehicleStatus | DriverStatus | string): string => {
  const colors: Record<string, string> = {
    // Vehicle statuses
    AVAILABLE: "bg-green-100 text-green-800 border-green-300",
    ON_TRIP: "bg-blue-100 text-blue-800 border-blue-300",
    IN_SHOP: "bg-yellow-100 text-yellow-800 border-yellow-300",
    RETIRED: "bg-gray-100 text-gray-800 border-gray-300",
    // Driver statuses
    OFF_DUTY: "bg-gray-100 text-gray-800 border-gray-300",
    SUSPENDED: "bg-red-100 text-red-800 border-red-300",
  };
  return (colors[status] || colors["AVAILABLE"]) as string;
};

export const getExpiryColor = (expiryDate: Date): string => {
  const now = new Date();
  const diffDays = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return "bg-red-100 text-red-800 border-red-300"; // Expired
  } else if (diffDays <= 30) {
    return "bg-yellow-100 text-yellow-800 border-yellow-300"; // Expiring soon
  }
  return ""; // No badge
};

export const getExpiryLabel = (expiryDate: Date): string | null => {
  const now = new Date();
  const diffDays = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return "Expired";
  } else if (diffDays <= 30) {
    return "Expiring soon";
  }
  return null;
};

export const StatusBadge = ({ status }: { status: string }): React.ReactElement => {
  const color = getStatusColor(status);
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${color}`}>
      {status}
    </span>
  );
};
