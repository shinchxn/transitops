// File: backend/src/middleware/validate.ts
// Accepting separate schemas per request part (body/query/params) instead
// of one big schema lets query-string values (which arrive as strings)
// use z.coerce.number()/z.coerce.date() cleanly without contaminating the
// body schema's types.
import { RequestHandler } from "express";
import { ZodSchema } from "zod";

interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export const validate =
  (schemas: ValidationSchemas): RequestHandler =>
  (req, res, next) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) req.query = schemas.query.parse(req.query) as any;
      if (schemas.params) req.params = schemas.params.parse(req.params) as any;
      next();
    } catch (err) {
      next(err); // ZodError is caught by errorHandler and formatted there
    }
  };
