import { Request, Response, NextFunction } from 'express';
import { ApiErrorResponse } from '@school/shared';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: unknown;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = 'statusCode' in err ? err.statusCode : 500;
  const code = 'code' in err ? err.code : 'INTERNAL_SERVER_ERROR';
  const requestId = req.id || 'unknown';

  // Do not expose stack traces or raw internal errors in production
  const message =
    statusCode >= 500 && process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred. Please contact system administration.'
      : err.message;

  const errorResponse: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      details: 'details' in err ? err.details : undefined,
      requestId,
      timestamp: new Date().toISOString(),
    },
  };

  res.status(statusCode).json(errorResponse);
}

export function notFoundHandler(req: Request, res: Response): void {
  const requestId = req.id || 'unknown';
  const errorResponse: ApiErrorResponse = {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Resource not found: ${req.method} ${req.originalUrl}`,
      requestId,
      timestamp: new Date().toISOString(),
    },
  };
  res.status(404).json(errorResponse);
}
