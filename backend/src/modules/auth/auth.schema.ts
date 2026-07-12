// File: backend/src/modules/auth/auth.schema.ts
import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});
