// File: backend/src/middleware/auth.ts
// JWT authentication and RBAC middleware.
// Agent A owns this file; this implementation is the real production version
// used by every module — not a stub.

import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { Role } from "../shared/types";
import { AppError } from "../lib/AppError";

// ─── Augment Express Request with the decoded user ────────────────────────────
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: Role;
      };
    }
  }
}

interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: Role;
}

/**
 * requireAuth — validates the JWT from the `Authorization: Bearer …` header
 * OR from the `token` httpOnly cookie. Either transport works so curl-based
 * testing (with cookies.txt) and the Axios client both work out of the box.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const secret = process.env["JWT_SECRET"];
  if (!secret) throw new Error("JWT_SECRET env var is not set.");

  // Accept token from Authorization header or cookie.
  const authHeader = req.headers["authorization"];
  const headerToken =
    authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  const cookieToken: string | undefined =
    (req.cookies as Record<string, string | undefined>)["token"];

  const token = headerToken ?? cookieToken;

  if (!token) {
    next(new AppError(401, "UNAUTHENTICATED", "Authentication required."));
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;
    req.user = {
      id: payload["sub"],
      email: payload["email"],
      name: payload["name"],
      role: payload["role"],
    };
    next();
  } catch {
    next(new AppError(401, "INVALID_TOKEN", "Token is invalid or has expired."));
  }
}

/**
 * requireRole — RBAC guard. Call after requireAuth in the middleware chain.
 * Usage: requireRole("FLEET_MANAGER", "DRIVER")
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, "UNAUTHENTICATED", "Authentication required."));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(
        new AppError(
          403,
          "FORBIDDEN",
          `This action requires one of the following roles: ${roles.join(", ")}.`
        )
      );
      return;
    }
    next();
  };
}
