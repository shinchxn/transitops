// File: backend/src/lib/AppError.ts
// Centralized error handling — all app errors extend this.

export interface FieldError {
  path: string;
  message: string;
}

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public fields: FieldError[] = []
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
      ...(this.fields.length > 0 && { fields: this.fields }),
    };
  }
}
