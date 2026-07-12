// File: backend/src/shared/types.ts
// Mirrors the Prisma enums 1:1 (SOLUTION.md Section 6) so both backend
// route handlers and the frontend can share literal-union types without
// the frontend depending on @prisma/client.

export type Role = "FLEET_MANAGER" | "DRIVER" | "SAFETY_OFFICER" | "FINANCIAL_ANALYST";
export type VehicleStatus = "AVAILABLE" | "ON_TRIP" | "IN_SHOP" | "RETIRED";
export type DriverStatus = "AVAILABLE" | "ON_TRIP" | "OFF_DUTY" | "SUSPENDED";
export type TripStatus = "DRAFT" | "DISPATCHED" | "COMPLETED" | "CANCELLED";
export type MaintenanceStatus = "OPEN" | "CLOSED";
export type ExpenseType = "TOLL" | "MAINTENANCE" | "OTHER";

// Later agents append their request/response DTO types below this line.
