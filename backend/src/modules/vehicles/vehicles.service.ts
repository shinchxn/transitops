// File: backend/src/modules/vehicles/vehicles.service.ts

import prisma from "../../lib/prisma";
import { AppError } from "../../lib/AppError";
import { emitEvent } from "../../lib/socket";
import { SOCKET_EVENTS } from "../../lib/socket";
import {
  CreateVehicleInput,
  UpdateVehicleInput,
  VehicleQuery,
} from "./vehicles.schema";

export class VehicleService {
  /**
   * List vehicles with dynamic filtering, search, sorting, and pagination.
   * Uses $transaction to fetch both data and total count in a single round trip.
   */
  async listVehicles(query: VehicleQuery) {
    const { status, type, region, search, sort, page, limit } = query;

    // Build where clause
    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = { contains: type, mode: "insensitive" };
    if (region) where.region = { contains: region, mode: "insensitive" };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { registrationNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    // Parse sort (leading "-" means descending)
    const orderBy: any = {};
    const sortField = sort.startsWith("-") ? sort.slice(1) : sort;
    const sortDir = sort.startsWith("-") ? "desc" : "asc";
    orderBy[sortField] = sortDir;

    // Pagination
    const skip = (page - 1) * limit;
    const take = limit;

    // Fetch both data and count in a single transaction
    const [data, total] = await prisma.$transaction([
      prisma.vehicle.findMany({
        where,
        orderBy,
        skip,
        take,
      }),
      prisma.vehicle.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Create a new vehicle. Throws a clean 400 on duplicate registrationNumber.
   */
  async createVehicle(input: CreateVehicleInput) {
    try {
      const vehicle = await prisma.vehicle.create({
        data: {
          ...input,
          status: "AVAILABLE",
        },
      });
      return vehicle;
    } catch (err: any) {
      if (err.code === "P2002" && err.meta?.target?.includes("registrationNumber")) {
        throw new AppError(400, "DUPLICATE_VALUE", "Registration number already in use.", [
          { path: "registrationNumber", message: "Already in use." },
        ]);
      }
      throw err;
    }
  }

  /**
   * Update a vehicle. Throws 404 if not found, and emits VEHICLE_UPDATED event.
   */
  async updateVehicle(id: string, input: UpdateVehicleInput) {
    try {
      const vehicle = await prisma.vehicle.update({
        where: { id },
        data: input,
      });

      // Emit event so other clients see the update in real-time
      emitEvent(SOCKET_EVENTS.VEHICLE_UPDATED, vehicle);

      return vehicle;
    } catch (err: any) {
      if (err.code === "P2025") {
        throw new AppError(404, "NOT_FOUND", "Vehicle not found.");
      }
      throw err;
    }
  }

  /**
   * Get a single vehicle by ID.
   */
  async getVehicleById(id: string) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) {
      throw new AppError(404, "NOT_FOUND", "Vehicle not found.");
    }
    return vehicle;
  }
}

export const vehicleService = new VehicleService();
