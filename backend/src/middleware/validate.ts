// File: backend/src/middleware/validate.ts
// Zod validation middleware — validates req.body, req.query, and/or req.params
// against a schema before the request reaches any controller.

import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";

interface ValidateTargets {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Usage in routes:
 *   router.post("/", validate({ body: CreateTripSchema }), asyncHandler(create))
 *   router.get("/",  validate({ query: TripQuerySchema }), asyncHandler(list))
 *
 * On failure, ZodError is thrown and caught by the central errorHandler which
 * returns a 400 with field-level error details.
 */
export function validate(targets: ValidateTargets) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (targets.body) {
        req.body = targets.body.parse(req.body) as unknown;
      }
      if (targets.query) {
        req.query = targets.query.parse(req.query) as Record<string, string>;
      }
      if (targets.params) {
        req.params = targets.params.parse(req.params) as Record<string, string>;
      }
      next();
    } catch (err) {
      next(err); // ZodError → errorHandler → 400 JSON
    }
  };
}
