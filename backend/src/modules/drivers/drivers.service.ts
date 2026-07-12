// File: backend/src/modules/drivers/drivers.service.ts

import { addDays } from "date-fns";
import prisma from "../../lib/prisma";
import { AppError } from "../../lib/AppError";
import { emitEvent } from "../../lib/socket";
import { SOCKET_EVENTS } from "../../lib/socket";
import {
  CreateDriverInput,
  UpdateDriverInput,
  DriverQuery,
} from "./drivers.schema";

export class DriverService {
  /**
   * List drivers with dynamic filtering, search, sorting, and pagination.
   * expiringWithinDays filters licenses expiring within N days from now.
   */
  async listDrivers(query: DriverQuery) {
    const { status, search, expiringWithinDays, sort, page, limit } = query;

    // Build where clause
    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { licenseNumber: { contains: search, mode: "insensitive" } },
      ];
    }
    if (expiringWithinDays) {
      const expiryLimit = addDays(new Date(), expiringWithinDays);
      where.licenseExpiryDate = { lte: expiryLimit };
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
      prisma.driver.findMany({
        where,
        orderBy,
        skip,
        take,
      }),
      prisma.driver.count({ where }),
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
   * Create a new driver. Throws a clean 400 on duplicate licenseNumber.
   */
  async createDriver(input: CreateDriverInput) {
    try {
      const driver = await prisma.driver.create({
        data: {
          ...input,
          status: "AVAILABLE",
          safetyScore: 100,
        },
      });
      return driver;
    } catch (err: any) {
      if (err.code === "P2002" && err.meta?.target?.includes("licenseNumber")) {
        throw new AppError(400, "DUPLICATE_VALUE", "License number already in use.", [
          { path: "licenseNumber", message: "Already in use." },
        ]);
      }
      throw err;
    }
  }

  /**
   * Update a driver. Throws 404 if not found, and emits DRIVER_UPDATED event.
   */
  async updateDriver(id: string, input: UpdateDriverInput) {
    try {
      const driver = await prisma.driver.update({
        where: { id },
        data: input,
      });

      // Emit event so other clients see the update in real-time
      emitEvent(SOCKET_EVENTS.DRIVER_UPDATED, driver);

      return driver;
    } catch (err: any) {
      if (err.code === "P2025") {
        throw new AppError(404, "NOT_FOUND", "Driver not found.");
      }
      throw err;
    }
  }

  /**
   * Get a single driver by ID.
   */
  async getDriverById(id: string) {
    const driver = await prisma.driver.findUnique({ where: { id } });
    if (!driver) {
      throw new AppError(404, "NOT_FOUND", "Driver not found.");
    }
    return driver;
  }
}

export const driverService = new DriverService();
