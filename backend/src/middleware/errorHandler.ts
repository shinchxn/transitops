// File: backend/src/middleware/errorHandler.ts
// Centralizing error → HTTP-response translation here means every module
// can just `throw` (AppError, ZodError, or a raw Prisma error) and never
// worry about response formatting, which is what keeps error shapes
// consistent across four independently-written modules. Register this
// with app.use(errorHandler) LAST, after all routes.
import { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AppError } from "../lib/AppError";

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      ...(err.fields ? { fields: err.fields } : {}),
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      message: "One or more fields are invalid.",
      fields: err.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const target = (err.meta?.target as string[] | undefined)?.join(", ") ?? "field";
      return res.status(400).json({
        error: "DUPLICATE_VALUE",
        message: `${target} must be unique.`,
        fields: [{ path: target, message: "Already in use." }],
      });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ error: "NOT_FOUND", message: "Resource not found." });
    }
  }

  // Never leak internals to the client — log full detail server-side only.
  console.error("[unhandled]", err);
  return res.status(500).json({ error: "INTERNAL_ERROR", message: "Something went wrong." });
};
