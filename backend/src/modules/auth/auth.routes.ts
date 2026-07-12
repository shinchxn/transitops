// File: backend/src/modules/auth/auth.routes.ts
import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../middleware/asyncHandler";
import { LoginSchema } from "./auth.schema";
import * as controller from "./auth.controller";

const router = Router();

// POST /api/auth/login — public
router.post("/login", validate({ body: LoginSchema }), asyncHandler(controller.login));

// GET /api/auth/me — any authenticated user
router.get("/me", requireAuth, asyncHandler(controller.me));

// POST /api/auth/logout — intentional extension beyond spec; clears cookie
router.post("/logout", asyncHandler(controller.logout));

export default router;
