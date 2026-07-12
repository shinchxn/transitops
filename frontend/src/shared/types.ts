// File: frontend/src/shared/types.ts
// Mirrors backend/src/shared/types.ts 1:1. Frontend and backend are
// separate TS projects and can't share an import path, so this is
// re-declared here rather than imported — keep both files in sync by hand.

export type Role = "FLEET_MANAGER" | "DRIVER" | "SAFETY_OFFICER" | "FINANCIAL_ANALYST";
export type VehicleStatus = "AVAILABLE" | "ON_TRIP" | "IN_SHOP" | "RETIRED";
export type DriverStatus = "AVAILABLE" | "ON_TRIP" | "OFF_DUTY" | "SUSPENDED";
export type TripStatus = "DRAFT" | "DISPATCHED" | "COMPLETED" | "CANCELLED";
export type MaintenanceStatus = "OPEN" | "CLOSED";
export type ExpenseType = "TOLL" | "MAINTENANCE" | "OTHER";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}
