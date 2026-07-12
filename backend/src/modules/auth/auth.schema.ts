// File: backend/src/modules/auth/auth.schema.ts
import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email("Must be a valid email."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export type LoginInput = z.infer<typeof LoginSchema>;
