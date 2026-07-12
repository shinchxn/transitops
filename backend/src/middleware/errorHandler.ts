// File: backend/src/middleware/errorHandler.ts
// Central error-handling middleware — must be registered last in Agent A's Express app.
// Converts AppError instances and Zod validation errors into a consistent JSON shape.
// Never leaks stack traces to the client in production.

import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib/AppError";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // Zod validation failures — parse the field-level errors into a flat list.
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Request validation failed.",
      fields: err.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    });
    return;
  }

  // Known application errors (business rule violations).
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
    });
    return;
  }

  // Unknown errors — log the full stack server-side, return a generic 500.
  console.error("[UnhandledError]", err);
  res.status(500).json({
    error: "INTERNAL_ERROR",
    message: "An unexpected error occurred.",
  });
};
