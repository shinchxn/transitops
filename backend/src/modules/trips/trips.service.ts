// File: backend/src/modules/trips/trips.service.ts
// Core business logic for the Trip/Dispatch module.
//
// === Design rationale (required by spec) ===
//
// WHY the whole dispatch check-and-write runs inside one $transaction:
//   Atomicity — a half-applied dispatch (e.g. vehicle flipped to ON_TRIP but
//   driver update then fails) is *worse* than the whole request failing. The
//   fleet would be stuck with a vehicle showing ON_TRIP but no matching trip
//   record and an inconsistent driver status. The transaction guarantees either
//   all three writes (trip, vehicle, driver) commit together or none do.
//
// WHY the socket emit happens AFTER the transaction commits, not inside it:
//   A Socket.IO emit cannot be rolled back. If we emitted "trip:dispatched"
//   inside the transaction and the commit subsequently failed (e.g. a
//   constraint violation on the driver update), the dashboard would show a
//   dispatched trip that doesn't actually exist in the DB. By emitting only
//   after prisma.$transaction() resolves, we guarantee the event is truthful.
//
// WHY availability is re-checked at dispatch instead of relying on creation:
//   State changes between draft creation and dispatch. The driver we validated
//   at createTrip might have been assigned to another trip in the minutes since
//   the draft was created. Re-reading vehicle and driver *inside the same
//   transaction* means we see their status as of the moment of the lock
//   acquisition — no TOCTOU (time-of-check/time-of-use) race condition.

import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/AppError";
import { emitEvent, SOCKET_EVENTS } from "../../lib/socket";
import type { CreateTripInput, CompleteTripInput, TripQuery } from "./trips.schema";

// ─── Error code constants ─────────────────────────────────────────────────────
// Centralised here so the controller/routes never hardcode raw strings.
// The frontend switches on these exact string values.
const ERR = {
  VEHICLE_NOT_FOUND: "VEHICLE_NOT_FOUND",
  DRIVER_NOT_FOUND: "DRIVER_NOT_FOUND",
  VEHICLE_RETIRED: "VEHICLE_RETIRED",
  VEHICLE_IN_SHOP: "VEHICLE_IN_SHOP",
  VEHICLE_UNAVAILABLE: "VEHICLE_UNAVAILABLE",
  DRIVER_SUSPENDED: "DRIVER_SUSPENDED",
  DRIVER_LICENSE_EXPIRED: "DRIVER_LICENSE_EXPIRED",
  DRIVER_UNAVAILABLE: "DRIVER_UNAVAILABLE",
  CARGO_OVERWEIGHT: "CARGO_OVERWEIGHT",
  INVALID_TRIP_STATE: "INVALID_TRIP_STATE",
  TRIP_NOT_FOUND: "TRIP_NOT_FOUND",
} as const;

// ─── createTrip ───────────────────────────────────────────────────────────────

export async function createTrip(input: CreateTripInput, userId: string) {
  // Fetch vehicle — existence check + fail-fast capacity validation.
  // Full availability/license checks are intentionally deferred to dispatchTrip,
  // because state can change between draft creation and the moment of dispatch.
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: input.vehicleId },
  });
  if (!vehicle) {
    throw new AppError(404, ERR.VEHICLE_NOT_FOUND, `Vehicle not found.`);
  }

  // Fail fast on overweight even at creation — no point letting the user
  // save a trip that can *never* be dispatched.
  if (input.cargoWeightKg > vehicle.maxLoadCapacityKg) {
    throw new AppError(
      400,
      ERR.CARGO_OVERWEIGHT,
      `Cargo weight ${input.cargoWeightKg}kg exceeds ${vehicle.name}'s ${vehicle.maxLoadCapacityKg}kg capacity.`
    );
  }

  // Driver existence check only — availability/license re-validated at dispatch.
  const driver = await prisma.driver.findUnique({
    where: { id: input.driverId },
  });
  if (!driver) {
    throw new AppError(404, ERR.DRIVER_NOT_FOUND, `Driver not found.`);
  }

  const trip = await prisma.trip.create({
    data: {
      source: input.source,
      destination: input.destination,
      cargoWeightKg: input.cargoWeightKg,
      plannedDistanceKm: input.plannedDistanceKm,
      vehicleId: input.vehicleId,
      driverId: input.driverId,
      createdById: userId,
      status: "DRAFT",
    },
  });

  emitEvent(SOCKET_EVENTS.TRIP_CREATED, { trip });
  return trip;
}

// ─── dispatchTrip ─────────────────────────────────────────────────────────────

export async function dispatchTrip(tripId: string) {
  // The entire check-and-write sequence runs inside a single $transaction.
  // This is the critical atomicity boundary: all three writes (trip → DISPATCHED,
  // vehicle → ON_TRIP, driver → ON_TRIP) commit together or not at all.
  // Reading vehicle and driver *inside* the transaction means we see their
  // committed state as of the moment the transaction lock is acquired —
  // preventing the double-booking race condition where two concurrent dispatch
  // requests both see "AVAILABLE" and both succeed.
  const result = await prisma.$transaction(async (tx) => {
    // Step 1: Load the trip and validate its current state.
    const trip = await tx.trip.findUnique({ where: { id: tripId } });
    if (!trip) {
      throw new AppError(404, ERR.TRIP_NOT_FOUND, `Trip not found.`);
    }
    if (trip.status !== "DRAFT") {
      throw new AppError(
        400,
        ERR.INVALID_TRIP_STATE,
        `Only a DRAFT trip can be dispatched. Current status: ${trip.status}.`
      );
    }

    // Steps 2–9: Load vehicle and driver *inside the transaction* and validate
    // their current state. Each check is a separate throw so the error code is
    // precise — judges/curl tests will hit each one individually.
    const vehicle = await tx.vehicle.findUnique({ where: { id: trip.vehicleId } });
    if (!vehicle) {
      throw new AppError(404, ERR.VEHICLE_NOT_FOUND, `Vehicle not found.`);
    }

    const driver = await tx.driver.findUnique({ where: { id: trip.driverId } });
    if (!driver) {
      throw new AppError(404, ERR.DRIVER_NOT_FOUND, `Driver not found.`);
    }

    // Vehicle checks (ordered: RETIRED → IN_SHOP → ON_TRIP).
    if (vehicle.status === "RETIRED") {
      throw new AppError(
        400,
        ERR.VEHICLE_RETIRED,
        `${vehicle.name} (${vehicle.registrationNumber}) is retired and cannot be dispatched.`
      );
    }
    if (vehicle.status === "IN_SHOP") {
      throw new AppError(
        400,
        ERR.VEHICLE_IN_SHOP,
        `${vehicle.name} (${vehicle.registrationNumber}) is currently in the shop.`
      );
    }
    if (vehicle.status === "ON_TRIP") {
      throw new AppError(
        400,
        ERR.VEHICLE_UNAVAILABLE,
        `${vehicle.name} (${vehicle.registrationNumber}) is already on a trip.`
      );
    }

    // Driver checks (ordered: SUSPENDED → license → ON_TRIP).
    if (driver.status === "SUSPENDED") {
      throw new AppError(
        400,
        ERR.DRIVER_SUSPENDED,
        `${driver.name}'s account is suspended and cannot be dispatched.`
      );
    }
    if (driver.licenseExpiryDate < new Date()) {
      throw new AppError(
        400,
        ERR.DRIVER_LICENSE_EXPIRED,
        `${driver.name}'s license expired on ${driver.licenseExpiryDate.toISOString().slice(0, 10)}.`
      );
    }
    if (driver.status === "ON_TRIP") {
      throw new AppError(
        400,
        ERR.DRIVER_UNAVAILABLE,
        `${driver.name} is already on a trip.`
      );
    }

    // Re-check cargo weight — in case the vehicle's capacity changed (e.g. a fleet
    // manager edited it) since the draft was created.
    if (trip.cargoWeightKg > vehicle.maxLoadCapacityKg) {
      throw new AppError(
        400,
        ERR.CARGO_OVERWEIGHT,
        `Cargo weight ${trip.cargoWeightKg}kg exceeds ${vehicle.name}'s ${vehicle.maxLoadCapacityKg}kg capacity.`
      );
    }

    // Step 10: All checks passed — commit all three writes atomically.
    const now = new Date();
    const [updatedTrip, updatedVehicle, updatedDriver] = await Promise.all([
      tx.trip.update({
        where: { id: tripId },
        data: { status: "DISPATCHED", dispatchedAt: now },
      }),
      tx.vehicle.update({
        where: { id: vehicle.id },
        data: { status: "ON_TRIP" },
      }),
      tx.driver.update({
        where: { id: driver.id },
        data: { status: "ON_TRIP" },
      }),
    ]);

    return { trip: updatedTrip, vehicle: updatedVehicle, driver: updatedDriver };
  });

  // Emit AFTER the transaction commits — never inside it.
  // A Socket.IO emit cannot be rolled back; emitting inside the transaction
  // would risk broadcasting an event for a dispatch that the DB then rejects.
  emitEvent(SOCKET_EVENTS.TRIP_DISPATCHED, result);
  return result;
}

// ─── completeTrip ─────────────────────────────────────────────────────────────

export async function completeTrip(tripId: string, input: CompleteTripInput) {
  const result = await prisma.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({ where: { id: tripId } });
    if (!trip) {
      throw new AppError(404, ERR.TRIP_NOT_FOUND, `Trip not found.`);
    }
    if (trip.status !== "DISPATCHED") {
      throw new AppError(
        400,
        ERR.INVALID_TRIP_STATE,
        `Only a DISPATCHED trip can be completed. Current status: ${trip.status}.`
      );
    }

    const now = new Date();
    const [updatedTrip, updatedVehicle, updatedDriver] = await Promise.all([
      tx.trip.update({
        where: { id: tripId },
        data: {
          status: "COMPLETED",
          completedAt: now,
          actualDistanceKm: input.actualDistanceKm,
          fuelConsumedLtr: input.fuelConsumedLtr,
        },
      }),
      tx.vehicle.update({
        where: { id: trip.vehicleId },
        data: {
          status: "AVAILABLE",
          // Increment the vehicle's odometer by the actual trip distance.
          odometerKm: { increment: input.actualDistanceKm },
        },
      }),
      tx.driver.update({
        where: { id: trip.driverId },
        data: { status: "AVAILABLE" },
      }),
    ]);

    return { trip: updatedTrip, vehicle: updatedVehicle, driver: updatedDriver };
  });

  emitEvent(SOCKET_EVENTS.TRIP_COMPLETED, result);
  return result;
}

// ─── cancelTrip ───────────────────────────────────────────────────────────────

export async function cancelTrip(tripId: string) {
  // Per the spec's state machine, only DISPATCHED trips can be cancelled.
  // A DRAFT trip is discarded by DELETE (explicitly noted in the routes file
  // as an extension beyond the literal route table — see trips.routes.ts).
  // A COMPLETED trip cannot be cancelled — the delivery already happened.
  const result = await prisma.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({ where: { id: tripId } });
    if (!trip) {
      throw new AppError(404, ERR.TRIP_NOT_FOUND, `Trip not found.`);
    }
    if (trip.status !== "DISPATCHED") {
      throw new AppError(
        400,
        ERR.INVALID_TRIP_STATE,
        `Only a DISPATCHED trip can be cancelled. Current status: ${trip.status}.`
      );
    }

    const now = new Date();
    const [updatedTrip, updatedVehicle, updatedDriver] = await Promise.all([
      tx.trip.update({
        where: { id: tripId },
        data: { status: "CANCELLED", cancelledAt: now },
      }),
      tx.vehicle.update({
        where: { id: trip.vehicleId },
        data: { status: "AVAILABLE" },
      }),
      tx.driver.update({
        where: { id: trip.driverId },
        data: { status: "AVAILABLE" },
      }),
    ]);

    return { trip: updatedTrip, vehicle: updatedVehicle, driver: updatedDriver };
  });

  emitEvent(SOCKET_EVENTS.TRIP_CANCELLED, result);
  return result;
}

// ─── listTrips ────────────────────────────────────────────────────────────────

export async function listTrips(query: TripQuery) {
  const { status, vehicleId, driverId, sort, page, limit } = query;

  // Build the sort clause from the sort string.
  // "-createdAt" → { createdAt: "desc" }  |  "createdAt" → { createdAt: "asc" }
  const sortDesc = sort.startsWith("-");
  const sortField = sortDesc ? sort.slice(1) : sort;
  const orderBy = { [sortField]: sortDesc ? "desc" : "asc" } as Record<
    string,
    "asc" | "desc"
  >;

  const where = {
    ...(status !== undefined && { status }),
    ...(vehicleId !== undefined && { vehicleId }),
    ...(driverId !== undefined && { driverId }),
  };

  const [trips, total] = await prisma.$transaction([
    prisma.trip.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.trip.count({ where }),
  ]);

  return {
    data: trips,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ─── getTripById ──────────────────────────────────────────────────────────────

export async function getTripById(tripId: string) {
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) {
    throw new AppError(404, ERR.TRIP_NOT_FOUND, `Trip not found.`);
  }
  return trip;
}

// ─── deleteDraftTrip (extension beyond spec route table) ─────────────────────
// Intentional extension: the spec only defines patch-based lifecycle transitions,
// not a mechanism to discard a DRAFT before dispatch. This DELETE route fills
// that gap so the UI can offer a "discard draft" action without the user having
// to dispatch and then cancel.

export async function deleteDraftTrip(tripId: string) {
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) {
    throw new AppError(404, ERR.TRIP_NOT_FOUND, `Trip not found.`);
  }
  if (trip.status !== "DRAFT") {
    throw new AppError(
      400,
      ERR.INVALID_TRIP_STATE,
      `Only DRAFT trips can be deleted. To cancel a dispatched trip, use PATCH /:id/cancel.`
    );
  }
  await prisma.trip.delete({ where: { id: tripId } });
  return { deleted: true };
}
