// File: backend/src/lib/AppError.ts
// A typed error class lets every module throw a specific status+code from
// deep inside a service function (e.g. "vehicle already ON_TRIP") and have
// one central handler turn it into the right HTTP response, instead of
// every controller repeating its own try/catch → res.status(...) logic.
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public fields?: { path: string; message: string }[]
  ) {
    super(message);
    this.name = "AppError";
  }
}
