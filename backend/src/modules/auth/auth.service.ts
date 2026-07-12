// File: backend/src/modules/auth/auth.service.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/AppError";
import { env } from "../../config/env";
import { AuthedUser } from "../../middleware/auth";

export interface LoginResult {
  token: string;
  user: { id: string; email: string; name: string; role: AuthedUser["role"] };
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const user = await prisma.user.findUnique({ where: { email } });

  // NOTE (flagged deviation): SOLUTION.md's auth spec checks `!isActive`
  // here, but the committed schema.prisma has no `isActive` field on
  // User — that field was dropped from Phase 0's schema, which itself
  // has drifted from SOLUTION.md's contract (see repo-wide flag). This
  // check is a no-op stub until the team re-syncs the schema; the shape
  // is left in place (commented) so re-adding the field is a one-line fix.
  if (!user /* || !user.isActive */) {
    // Deliberately the same error for "no such user" and "wrong password" —
    // never reveal which one it was, to avoid leaking valid emails.
    throw new AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
  }

  const payload: AuthedUser = { sub: user.id, email: user.email, role: user.role };
  const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions);

  return {
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(401, "AUTH_INVALID", "Session expired or invalid, please log in again.");
  }
  // Re-fetched from DB (not just decoded from the JWT) so a role change
  // takes effect immediately without forcing a re-login.
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}
