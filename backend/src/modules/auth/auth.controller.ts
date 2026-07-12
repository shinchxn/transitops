// File: backend/src/modules/auth/auth.controller.ts
import { Request, Response } from "express";
import * as authService from "./auth.service";
import { env } from "../../config/env";

const COOKIE_NAME = "transitops_token";

// Parses a jsonwebtoken-style duration string ("8h", "30m", "1d") into ms
// for the cookie's maxAge, so the cookie expires in step with the JWT.
function expiresInToMs(expiresIn: string): number {
  const FALLBACK_MS = 8 * 60 * 60 * 1000; // 8h
  const match = /^(\d+)([smhd])$/.exec(expiresIn);
  const rawValue = match?.[1];
  const unit = match?.[2];
  if (!rawValue || !unit) return FALLBACK_MS;

  const multipliers: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return Number(rawValue) * (multipliers[unit] ?? FALLBACK_MS);
}

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.NODE_ENV === "production",
  maxAge: expiresInToMs(env.JWT_EXPIRES_IN),
};

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  const { token, user } = await authService.login(email, password);

  // The token only ever lives in the httpOnly cookie — never returned in
  // the JSON body, so client-side JS has no way to read or leak it.
  res.cookie(COOKIE_NAME, token, cookieOptions);
  res.status(200).json({ user });
}

export async function me(req: Request, res: Response) {
  const user = await authService.getCurrentUser(req.user!.sub);
  res.status(200).json({ user });
}

export async function logout(req: Request, res: Response) {
  res.clearCookie(COOKIE_NAME, { httpOnly: cookieOptions.httpOnly, sameSite: cookieOptions.sameSite, secure: cookieOptions.secure });
  res.status(204).send();
}
