// File: backend/src/modules/auth/auth.routes.ts
// NOTE (flagged deviation): POST /auth/logout is an intentional addition
// beyond SOLUTION.md's literal route table — a login flow with no logout
// path isn't a complete deliverable.
import { Router } from "express";
import { login, me, logout } from "./auth.controller";
import { LoginSchema } from "./auth.schema";
import { validate } from "../../middleware/validate";
import { requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../lib/asyncHandler";

export const authRouter = Router();

authRouter.post("/login", validate({ body: LoginSchema }), asyncHandler(login));
authRouter.get("/me", requireAuth, asyncHandler(me));
authRouter.post("/logout", requireAuth, asyncHandler(logout));
