// File: backend/src/lib/validate.ts
// Zod validation middleware — parses and coerces req.body/req.query.

import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { AppError } from "./AppError";

export interface ValidateOptions {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export const validate = (opts: ValidateOptions) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (opts.body) {
        const parsed = opts.body.parse(req.body);
        req.body = parsed;
      }
      if (opts.query) {
        const parsed = opts.query.parse(req.query);
        req.query = parsed as any;
      }
      if (opts.params) {
        const parsed = opts.params.parse(req.params);
        req.params = parsed as any;
      }
      next();
    } catch (err: any) {
      const fields = err.errors?.map((e: any) => ({
        path: e.path.join("."),
        message: e.message,
      })) || [];
      throw new AppError(400, "VALIDATION_ERROR", "One or more fields are invalid.", fields);
    }
  };
};
