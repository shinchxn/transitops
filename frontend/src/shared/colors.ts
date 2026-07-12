// File: frontend/src/shared/colors.ts
// The color contract Agents B/C/D must reuse rather than reinvent — one
// status badge look across Vehicles/Drivers/Trips pages.
const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  ON_TRIP: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  IN_SHOP: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  SUSPENDED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  RETIRED: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  OFF_DUTY: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  DISPATCHED: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const FALLBACK_COLOR = "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? FALLBACK_COLOR;
}
