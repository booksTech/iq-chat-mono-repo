export class AppError extends Error {
  statusCode: number;
  details: unknown;
  isOperational: boolean;

  constructor(message: string, statusCode: number, details: unknown = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}
