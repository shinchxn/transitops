// File: backend/src/modules/auth/auth.service.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/AppError";
import type { LoginInput } from "./auth.schema";

function getJwtSecret(): string {
  const s = process.env["JWT_SECRET"];
  if (!s) throw new Error("JWT_SECRET env var is not set.");
  return s;
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !user.isActive) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  }

  const match = await bcrypt.compare(input.password, user.passwordHash);
  if (!match) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  }

  const expiresIn = process.env["JWT_EXPIRES_IN"] ?? "8h";
  const token = jwt.sign(
    { sub: user.id, email: user.email, name: user.name, role: user.role },
    getJwtSecret(),
    { expiresIn } as jwt.SignOptions
  );

  return {
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
}
