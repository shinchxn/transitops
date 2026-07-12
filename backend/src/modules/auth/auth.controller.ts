// File: backend/src/modules/auth/auth.controller.ts
import type { Request, Response } from "express";
import * as service from "./auth.service";
import type { LoginInput } from "./auth.schema";

export async function login(req: Request, res: Response): Promise<void> {
  const input = req.body as LoginInput;
  const result = await service.login(input);

  // Set httpOnly cookie in addition to returning the token in the body,
  // so curl (via cookies.txt) and the browser Axios client both work.
  res.cookie("token", result.token, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    maxAge: 8 * 60 * 60 * 1000, // 8 hours in ms
  });

  res.json(result);
}

export async function me(req: Request, res: Response): Promise<void> {
  // requireAuth middleware guarantees req.user is populated.
  res.json(req.user);
}

export async function logout(_req: Request, res: Response): Promise<void> {
  res.clearCookie("token");
  res.json({ message: "Logged out." });
}
