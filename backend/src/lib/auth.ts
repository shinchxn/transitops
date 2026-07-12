// File: backend/src/lib/auth.ts
// Auth middleware: requireAuth checks JWT in cookies; requireRole checks role.

import { Request, Response, NextFunction } from "express";
import { AppError } from "./AppError";
import type { Role } from "../shared/types";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: Role;
      };
    }
  }
}

// In production, this would decode a JWT from req.cookies.token.
// For now, a placeholder that assumes auth is set by a previous middleware.
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }
  next();
};

export const requireRole = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError(403, "FORBIDDEN", "Insufficient permissions");
    }
    next();
  };
};
