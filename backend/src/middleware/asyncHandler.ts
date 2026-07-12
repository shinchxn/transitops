// File: backend/src/middleware/asyncHandler.ts
// Wraps async route handlers so thrown errors flow to errorHandler middleware
// without every route needing its own try/catch block.

import type { Request, Response, NextFunction, RequestHandler } from "express";

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void | Response>;

export function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
