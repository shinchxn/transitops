// File: backend/src/lib/AppError.ts
// Typed application error class used by every module's service layer.
// Keeps the error-handling middleware simple: it only needs to instanceof-check this class.

export class AppError extends Error {
  /** Machine-readable code consumed by the frontend's switch statement. */
  public readonly code: string;
  public readonly statusCode: number;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    // Restore prototype chain broken by extending built-in Error in TypeScript.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
