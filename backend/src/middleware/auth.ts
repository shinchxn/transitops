// File: backend/src/middleware/auth.ts
// JWT lives in an httpOnly cookie rather than localStorage specifically
// so client-side JS (and any XSS payload) can never read the token —
// the browser sends it automatically on same-site requests instead.
import { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../lib/AppError";
import { Role } from "../shared/types";
import { env } from "../config/env";

export interface AuthedUser {
  sub: string;
  email: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthedUser;
    }
  }
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const token = req.cookies?.transitops_token;
  if (!token) {
    return next(new AppError(401, "AUTH_REQUIRED", "You must be logged in."));
  }
  try {
    req.user = jwt.verify(token, env.JWT_SECRET) as AuthedUser;
    next();
  } catch {
    return next(new AppError(401, "AUTH_INVALID", "Session expired or invalid, please log in again."));
  }
};

export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, res, next) => {
    if (!req.user) {
      return next(new AppError(401, "AUTH_REQUIRED", "You must be logged in."));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(403, "FORBIDDEN", `This action requires one of: ${roles.join(", ")}.`)
      );
    }
    next();
  };
