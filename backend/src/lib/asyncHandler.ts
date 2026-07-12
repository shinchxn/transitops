// File: backend/src/lib/asyncHandler.ts
// Express 4 (locked version) does not auto-catch rejected promises from
// async route handlers — an unhandled rejection would hang the request
// instead of reaching errorHandler. Wrapping every controller closes that
// gap once, centrally, instead of every agent adding try/catch to every
// function. Every controller in every module (yours and B/C/D's) should
// be wrapped in this.
import { RequestHandler } from "express";

export const asyncHandler =
  (fn: RequestHandler): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
